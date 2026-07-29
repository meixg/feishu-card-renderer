import { execFile } from "node:child_process";
import { appendFile, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import {
  PACKAGE_NAME,
  expectedTag,
  planReleaseRecovery,
} from "./release-state.mjs";

const runFile = promisify(execFile);
const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const version = manifest.version;
const triggerCommit = process.env.RELEASE_TRIGGER_COMMIT;
const repository = process.env.GITHUB_REPOSITORY;

if (manifest.name !== PACKAGE_NAME || typeof repository !== "string") {
  throw new Error("release package or repository identity is invalid");
}

async function run(command, args, options = {}) {
  const { stdout } = await runFile(command, args, {
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });
  return stdout.trim();
}

async function npmState() {
  try {
    const source = await run("npm", [
      "view",
      `${PACKAGE_NAME}@${version}`,
      "version",
      "dist-tags.latest",
      "gitHead",
      "dist.attestations",
      "--json",
    ]);
    const value = JSON.parse(source);
    return {
      version: value.version,
      latest: value["dist-tags.latest"],
      gitHead: value.gitHead,
      provenance: Boolean(value["dist.attestations"]?.provenance),
    };
  } catch (error) {
    if (error?.stderr?.includes("E404")) return undefined;
    throw error;
  }
}

async function tagState(tagName) {
  try {
    const source = await run("gh", [
      "api",
      `repos/${repository}/git/ref/tags/${encodeURIComponent(tagName)}`,
    ]);
    const ref = JSON.parse(source);
    let object = ref.object;
    let kind = "lightweight";
    if (object?.type === "tag") {
      kind = "annotated";
      const annotated = JSON.parse(await run("gh", [
        "api",
        `repos/${repository}/git/tags/${object.sha}`,
      ]));
      object = annotated.object;
    }
    if (object?.type !== "commit" || !/^[0-9a-f]{40}$/u.test(object.sha)) {
      throw new Error(`release tag ${tagName} does not resolve to a commit`);
    }
    return { name: tagName, commit: object.sha, kind };
  } catch (error) {
    if (error?.stderr?.includes("HTTP 404")) return undefined;
    throw error;
  }
}

async function releaseState(tagName) {
  try {
    const source = await run("gh", [
      "release",
      "view",
      tagName,
      "--json",
      "tagName,isDraft,isPrerelease,assets",
    ]);
    const value = JSON.parse(source);
    return {
      tagName: value.tagName,
      draft: value.isDraft,
      prerelease: value.isPrerelease,
      assets: value.assets,
    };
  } catch (error) {
    if (error?.stderr?.includes("release not found")) return undefined;
    throw error;
  }
}

async function sourceVerification(sourceCommit) {
  const source = await run("gh", [
    "api",
    `repos/${repository}/commits/${sourceCommit}`,
  ]);
  const commit = JSON.parse(source);
  return {
    sha: commit.sha,
    verified: commit.commit?.verification?.verified === true,
    reason: commit.commit?.verification?.reason,
  };
}

async function inspect(requestedSourcePolicy) {
  const tagName = expectedTag(version);
  const npm = await npmState();
  const sourcePolicy = process.env.RELEASE_PHASE === "before-publish"
    ? (npm ? "existing-release" : "current-workflow")
    : requestedSourcePolicy;
  const sourceCommit = npm?.gitHead ?? triggerCommit;
  if (!/^[0-9a-f]{40}$/u.test(sourceCommit)) {
    throw new Error("release source commit must be a full SHA");
  }
  const [tag, release, verification] = await Promise.all([
    tagState(tagName),
    releaseState(tagName),
    sourceVerification(sourceCommit),
  ]);
  return {
    version,
    triggerCommit,
    sourcePolicy,
    npm,
    tag,
    release,
    sourceVerification: verification,
  };
}

let current = await inspect(process.env.RELEASE_SOURCE_POLICY);
let plan = planReleaseRecovery(current);
const readOnly = process.env.RELEASE_READ_ONLY === "1";

if (plan.state === "npm-unpublished" && process.env.RELEASE_PHASE !== "before-publish") {
  throw new Error(
    `npm does not contain ${PACKAGE_NAME}@${version}; publish outcome was `
    + `${process.env.PUBLISH_OUTCOME ?? "unknown"}, so metadata recovery is forbidden`,
  );
}
if (process.env.RELEASE_PHASE === "before-publish") {
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `should-publish=${plan.state === "npm-unpublished" ? "true" : "false"}\n`
      + `source_policy=${current.sourcePolicy}\n`,
    );
  }
  if (plan.state === "npm-unpublished") {
    console.log(`${plan.tagName} is unpublished; publish is bound to ${plan.sourceCommit}`);
    process.exit(0);
  }
}
if (readOnly && (plan.repairTag || plan.repairRelease)) {
  throw new Error(`read-only verification found incomplete metadata: ${plan.state}`);
}

if (plan.repairTag) {
  await run("gh", [
    "api",
    "--method",
    "POST",
    `repos/${repository}/git/refs`,
    "-f",
    `ref=refs/tags/${plan.tagName}`,
    "-f",
    `sha=${plan.sourceCommit}`,
  ]);
}
if (plan.repairRelease) {
  await run("gh", [
    "release",
    "create",
    plan.tagName,
    "--verify-tag",
    "--title",
    plan.tagName,
    "--generate-notes",
    "--target",
    plan.sourceCommit,
  ]);
}

if (plan.repairTag || plan.repairRelease) {
  current = await inspect(current.sourcePolicy);
  plan = planReleaseRecovery(current);
}
if (plan.state !== "consistent") {
  throw new Error(`release reconciliation did not converge: ${plan.state}`);
}

console.log(
  `Release record verified: ${plan.tagName} -> ${plan.sourceCommit}`
  + (version === "0.0.1" ? " (documented manual bootstrap provenance exception)" : ""),
);
