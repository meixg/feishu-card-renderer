import { execFile } from "node:child_process";
import {
  chmod,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const runFile = promisify(execFile);
const temporaryDirectories: string[] = [];
const releaseSource = resolve(import.meta.dirname, "../../scripts/reconcile-release.mjs");
const manifest = JSON.parse(
  await readFile(resolve(import.meta.dirname, "../../package.json"), "utf8"),
) as { version: string };
const releaseVersion = manifest.version;
const releaseTag = `feishu-card-renderer@${releaseVersion}`;
const publishedCommit = "2c266266a8e0164ddc711d116c5844848eef3660";
const laterMainCommit = "5dcc12a5f26819241ee1ebda8fb9824421fc021a";

async function command(directory: string, name: string, source: string) {
  const path = join(directory, name);
  await writeFile(path, `#!/usr/bin/env node\n${source}`);
  await chmod(path, 0o755);
}

async function fakeReleaseCommands(
  directory: string,
  {
    gitHead = publishedCommit,
    verified = true,
  }: { gitHead?: string; verified?: boolean } = {},
) {
  await command(directory, "npm", `
process.stdout.write(JSON.stringify({
  version: "${releaseVersion}",
  "dist-tags.latest": "${releaseVersion}",
  gitHead: "${gitHead}",
  "dist.attestations": { provenance: { predicateType: "https://slsa.dev/provenance/v1" } }
}));
`);
  await command(directory, "gh", `
const args = process.argv.slice(2).join(" ");
if (args.includes("/commits/")) {
  process.stdout.write(JSON.stringify({
    sha: "${gitHead}",
    commit: { verification: { verified: ${verified}, reason: "${verified ? "valid" : "unsigned"}" } }
  }));
} else if (args.includes("git/ref/tags/")) {
  process.stdout.write(JSON.stringify({ object: { type: "commit", sha: "${gitHead}" } }));
} else {
  process.stdout.write(JSON.stringify({
    tagName: "${releaseTag}",
    isDraft: false,
    isPrerelease: false,
    assets: []
  }));
}
`);
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })));
});

describe("release reconciliation adapter", () => {
  it("no-ops for the current version on a later main SHA by following npm gitHead", async () => {
    const directory = await mkdtemp(join(tmpdir(), "release-reconcile-"));
    temporaryDirectories.push(directory);
    const output = join(directory, "github-output");
    await writeFile(output, "");
    await fakeReleaseCommands(directory);

    const { stdout } = await runFile(process.execPath, [releaseSource], {
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        GITHUB_OUTPUT: output,
        GITHUB_REPOSITORY: "meixg/feishu-card-renderer",
        RELEASE_PHASE: "before-publish",
        RELEASE_READ_ONLY: "1",
        RELEASE_TRIGGER_COMMIT: laterMainCommit,
      },
    });

    expect(stdout).toContain(`${releaseTag} -> ${publishedCommit}`);
    expect(await readFile(output, "utf8")).toBe(
      "should-publish=false\nsource_policy=existing-release\n",
    );
  });

  it("rejects a publish race before creating metadata", async () => {
    const directory = await mkdtemp(join(tmpdir(), "release-reconcile-"));
    temporaryDirectories.push(directory);
    const otherCommit = "a".repeat(40);
    await fakeReleaseCommands(directory, { gitHead: otherCommit });

    await expect(runFile(process.execPath, [releaseSource], {
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        GITHUB_REPOSITORY: "meixg/feishu-card-renderer",
        RELEASE_READ_ONLY: "1",
        RELEASE_SOURCE_POLICY: "current-workflow",
        RELEASE_TRIGGER_COMMIT: laterMainCommit,
      },
    })).rejects.toMatchObject({
      stderr: expect.stringContaining("does not point to its trigger commit"),
    });
  });

  it("rejects an unverified source before metadata repair", async () => {
    const directory = await mkdtemp(join(tmpdir(), "release-reconcile-"));
    temporaryDirectories.push(directory);
    await fakeReleaseCommands(directory, { verified: false });

    await expect(runFile(process.execPath, [releaseSource], {
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        GITHUB_REPOSITORY: "meixg/feishu-card-renderer",
        RELEASE_READ_ONLY: "1",
        RELEASE_SOURCE_POLICY: "existing-release",
        RELEASE_TRIGGER_COMMIT: laterMainCommit,
      },
    })).rejects.toMatchObject({
      stderr: expect.stringContaining("must be verified by GitHub"),
    });
  });

  it("repairs only missing lightweight tag and Release after this workflow publishes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "release-reconcile-"));
    temporaryDirectories.push(directory);
    const npmCalls = join(directory, "npm-calls");
    await writeFile(npmCalls, "");
    await command(directory, "npm", `
const fs = require("node:fs");
fs.appendFileSync(process.env.FAKE_NPM_CALLS, process.argv.slice(2).join(" ") + "\\n");
process.stdout.write(JSON.stringify({
  version: "${releaseVersion}",
  "dist-tags.latest": "${releaseVersion}",
  gitHead: "${laterMainCommit}",
  "dist.attestations": { provenance: { predicateType: "https://slsa.dev/provenance/v1" } }
}));
`);
    await command(directory, "gh", `
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2).join(" ");
const tagState = path.join(process.env.FAKE_STATE_DIRECTORY, "tag-created");
const releaseState = path.join(process.env.FAKE_STATE_DIRECTORY, "release-created");
if (args.includes("/commits/")) {
  process.stdout.write(JSON.stringify({
    sha: "${laterMainCommit}",
    commit: { verification: { verified: true, reason: "valid" } }
  }));
} else if (args.includes("--method POST") && args.includes("git/refs")) {
  fs.writeFileSync(tagState, "lightweight");
} else if (args.includes("git/ref/tags/")) {
  if (!fs.existsSync(tagState)) {
    process.stderr.write("HTTP 404");
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({
    object: { type: "commit", sha: "${laterMainCommit}" }
  }));
} else if (args.includes("release create")) {
  fs.writeFileSync(releaseState, "release");
} else if (args.includes("release view")) {
  if (!fs.existsSync(releaseState)) {
    process.stderr.write("release not found");
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({
    tagName: "${releaseTag}",
    isDraft: false,
    isPrerelease: false,
    assets: []
  }));
}
`);

    const { stdout } = await runFile(process.execPath, [releaseSource], {
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        FAKE_NPM_CALLS: npmCalls,
        FAKE_STATE_DIRECTORY: directory,
        GITHUB_REPOSITORY: "meixg/feishu-card-renderer",
        RELEASE_SOURCE_POLICY: "current-workflow",
        RELEASE_TRIGGER_COMMIT: laterMainCommit,
      },
    });

    expect(stdout).toContain(`${releaseTag} -> ${laterMainCommit}`);
    expect(await readFile(join(directory, "tag-created"), "utf8")).toBe("lightweight");
    expect(await readFile(join(directory, "release-created"), "utf8")).toBe("release");
    expect(await readFile(npmCalls, "utf8")).toMatch(/^view /);
    expect(await readFile(npmCalls, "utf8")).not.toContain("publish");
  });
});
