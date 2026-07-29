import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import {
  PACKAGE_NAME,
  planReleaseRecovery,
} from "./release-state.mjs";

const runFile = promisify(execFile);
const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const version = manifest.version;
const commit = process.env.RELEASE_COMMIT;
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
    if (object?.type === "tag") {
      const annotated = JSON.parse(await run("gh", [
        "api",
        `repos/${repository}/git/tags/${object.sha}`,
      ]));
      object = annotated.object;
    }
    if (object?.type !== "commit" || !/^[0-9a-f]{40}$/u.test(object.sha)) {
      throw new Error(`release tag ${tagName} does not resolve to a commit`);
    }
    return { name: tagName, commit: object.sha };
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

async function inspect() {
  const tagName = `${PACKAGE_NAME}@${version}`;
  const [npm, tag, release] = await Promise.all([
    npmState(),
    tagState(tagName),
    releaseState(tagName),
  ]);
  return { version, commit, npm, tag, release };
}

let current = await inspect();
let plan = planReleaseRecovery(current);
const readOnly = process.env.RELEASE_READ_ONLY === "1";

if (plan.state === "npm-unpublished") {
  throw new Error(
    `npm does not contain ${PACKAGE_NAME}@${version}; Changesets outcome was `
    + `${process.env.CHANGESETS_OUTCOME ?? "unknown"}, so metadata recovery is forbidden`,
  );
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
    `sha=${commit}`,
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
    commit,
  ]);
}

if (plan.repairTag || plan.repairRelease) {
  current = await inspect();
  plan = planReleaseRecovery(current);
}
if (plan.state !== "consistent") {
  throw new Error(`release reconciliation did not converge: ${plan.state}`);
}

console.log(
  `Release record verified: ${plan.tagName} -> ${commit}`
  + (version === "0.0.1" ? " (documented manual bootstrap provenance exception)" : ""),
);
