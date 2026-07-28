import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  evaluateReleaseImpact,
  findActiveSkipLabelEvent,
  isChangesetsReleasePullRequest,
  isMaintainerPermission,
  validateChangesetDocument,
} from "./release-impact-policy.mjs";

const root = resolve(import.meta.dirname, "..");
const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
const pullRequest = event.pull_request;

if (!pullRequest) {
  throw new Error("release-impact check 只能处理 pull_request 事件。");
}

const releasePullRequest = isChangesetsReleasePullRequest({
  baseRef: pullRequest.base.ref,
  headRef: pullRequest.head.ref,
  author: pullRequest.user.login,
});

function changedChangesets() {
  const output = execFileSync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACMR", process.env.BASE_SHA, process.env.HEAD_SHA, "--", ".changeset/*.md"],
    { cwd: root, encoding: "utf8" },
  );
  return output.split(/\r?\n/u).filter((file) => /^\.changeset\/[^/]+\.md$/u.test(file));
}

const changesets = changedChangesets();
if (changesets.length > 0) {
  execFileSync(
    "pnpm",
    ["changeset", "status", `--since=${process.env.BASE_SHA}`],
    { cwd: root, encoding: "utf8", stdio: "inherit" },
  );
}
for (const file of changesets) {
  const result = validateChangesetDocument(await readFile(resolve(root, file), "utf8"));
  if (!result.ok) {
    throw new Error(`${file}: ${result.message}`);
  }
}

async function githubJson(path) {
  const response = await fetch(`${process.env.GITHUB_API_URL}${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${path} 返回 ${response.status}。`);
  }
  return response.json();
}

async function getAllLabelEvents() {
  const events = [];
  for (let page = 1; ; page += 1) {
    const batch = await githubJson(
      `/repos/${process.env.GITHUB_REPOSITORY}/issues/${pullRequest.number}/events?per_page=100&page=${page}`,
    );
    events.push(...batch);
    if (batch.length < 100) return events;
  }
}

const skipEvent = findActiveSkipLabelEvent(await getAllLabelEvents());
let skipAuthorized = false;
if (skipEvent?.actor?.login) {
  const permission = await githubJson(
    `/repos/${process.env.GITHUB_REPOSITORY}/collaborators/${encodeURIComponent(skipEvent.actor.login)}/permission`,
  );
  skipAuthorized = isMaintainerPermission(permission.permission);
}

const result = evaluateReleaseImpact({
  hasChangeset: changesets.length > 0,
  hasSkip: Boolean(skipEvent),
  skipAuthorized,
  releasePullRequest,
});

if (!result.ok) {
  throw new Error(`发布影响声明不符合策略：${result.code}`);
}
console.log(`发布影响声明通过：${result.code}`);
