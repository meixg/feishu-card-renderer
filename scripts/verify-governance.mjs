import { execFile as execFileCallback } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolve } from "node:path";

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, "..");
const repository = "meixg/feishu-card-renderer";
const apiRoot = `repos/${repository}`;

function fail(message) {
  throw new Error(`Governance verification failed: ${message}`);
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

function equal(actual, expected, message) {
  const canonicalActual = JSON.stringify(canonicalize(actual));
  const canonicalExpected = JSON.stringify(canonicalize(expected));
  if (canonicalActual !== canonicalExpected) {
    fail(`${message}\nexpected: ${JSON.stringify(expected)}\nactual: ${JSON.stringify(actual)}`);
  }
}

async function gh(...arguments_) {
  const { stdout } = await execFile("gh", arguments_, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
  return stdout;
}

async function api(path) {
  const output = await gh("api", path);
  try {
    return JSON.parse(output);
  } catch {
    fail(`GitHub API returned non-JSON data for ${path}`);
  }
}

function normalizePullRequestParameters(parameters) {
  const normalized = { ...parameters };
  if (Array.isArray(normalized.required_reviewers) && normalized.required_reviewers.length === 0) {
    delete normalized.required_reviewers;
  }
  if (
    normalized.automatic_copilot_code_review_enabled === false
    || normalized.automatic_copilot_code_review_enabled === undefined
  ) {
    delete normalized.automatic_copilot_code_review_enabled;
  }
  return normalized;
}

function normalizeRule(rule) {
  if (rule.type !== "pull_request") {
    return rule;
  }
  return {
    type: rule.type,
    parameters: normalizePullRequestParameters(rule.parameters),
  };
}

function normalizePayload(payload) {
  return {
    name: payload.name,
    target: payload.target,
    enforcement: payload.enforcement,
    bypass_actors: payload.bypass_actors,
    conditions: payload.conditions,
    rules: payload.rules.map(normalizeRule),
  };
}

function resolveRuleset(summaries, name, target) {
  const matches = summaries.filter((ruleset) => (
    ruleset.name === name && ruleset.target === target
  ));
  if (matches.length !== 1) {
    fail(`expected exactly one ${target} ruleset named "${name}", found ${matches.length}`);
  }
  return matches[0];
}

await gh("auth", "status");

const [expectedMain, expectedTags, permissions, summaries, effectiveMain] = await Promise.all([
  readFile(resolve(root, ".github/rulesets/main.json"), "utf8").then(JSON.parse),
  readFile(resolve(root, ".github/rulesets/release-tags.json"), "utf8").then(JSON.parse),
  api(`${apiRoot}/actions/permissions/workflow`),
  api(`${apiRoot}/rulesets`),
  api(`${apiRoot}/rules/branches/main`),
]);

equal(permissions, {
  default_workflow_permissions: "read",
  can_approve_pull_request_reviews: true,
}, "Actions workflow permissions drifted");

const mainSummary = resolveRuleset(summaries, expectedMain.name, expectedMain.target);
const tagSummary = resolveRuleset(summaries, expectedTags.name, expectedTags.target);
const [liveMain, liveTags] = await Promise.all([
  api(`${apiRoot}/rulesets/${mainSummary.id}`),
  api(`${apiRoot}/rulesets/${tagSummary.id}`),
]);

equal(
  normalizePayload(liveMain),
  normalizePayload(expectedMain),
  "live main ruleset drifted from .github/rulesets/main.json",
);
equal(
  normalizePayload(liveTags),
  normalizePayload(expectedTags),
  "live release tag ruleset drifted from .github/rulesets/release-tags.json",
);

const expectedEffectiveMain = expectedMain.rules.map(normalizeRule);
const normalizedEffectiveMain = effectiveMain.map(({ type, parameters }) => normalizeRule({
  type,
  ...(parameters === undefined ? {} : { parameters }),
}));
equal(
  normalizedEffectiveMain,
  expectedEffectiveMain,
  "effective main rules do not prove the checked-in protection contract",
);

const tagRuleTypes = liveTags.rules.map((rule) => rule.type);
equal(tagRuleTypes, ["update", "deletion"], "release tags must allow creation and block updates/deletion");
if (tagRuleTypes.includes("creation")) {
  fail("release tag creation is unexpectedly blocked");
}

console.log(`Governance live state verified at ${new Date().toISOString()}.`);
console.log(
  `Actions: default=read, create/update PRs=true; main ruleset=${liveMain.id}; `
  + `tag ruleset=${liveTags.id}.`,
);
console.log(
  "Effective main: PR required, branch up to date, conversations resolved, "
  + "deletion/non-fast-forward blocked, 4 GitHub Actions App checks required.",
);
console.log("Release tags: creation allowed; update and deletion blocked.");
