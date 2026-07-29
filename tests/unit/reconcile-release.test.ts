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
const publishedCommit = "2c266266a8e0164ddc711d116c5844848eef3660";
const laterMainCommit = "5dcc12a5f26819241ee1ebda8fb9824421fc021a";

async function command(directory: string, name: string, source: string) {
  const path = join(directory, name);
  await writeFile(path, `#!/usr/bin/env node\n${source}`);
  await chmod(path, 0o755);
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })));
});

describe("release reconciliation adapter", () => {
  it("no-ops for 0.0.1 on a later main SHA by following npm gitHead", async () => {
    const directory = await mkdtemp(join(tmpdir(), "release-reconcile-"));
    temporaryDirectories.push(directory);
    const output = join(directory, "github-output");
    await writeFile(output, "");
    await command(directory, "npm", `
process.stdout.write(JSON.stringify({
  version: "0.0.1",
  "dist-tags.latest": "0.0.1",
  gitHead: "${publishedCommit}"
}));
`);
    await command(directory, "gh", `
const args = process.argv.slice(2).join(" ");
if (args.includes("git/ref/tags/")) {
  process.stdout.write(JSON.stringify({ object: { type: "commit", sha: "${publishedCommit}" } }));
} else {
  process.stdout.write(JSON.stringify({
    tagName: "feishu-card-renderer@0.0.1",
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
        GITHUB_OUTPUT: output,
        GITHUB_REPOSITORY: "meixg/feishu-card-renderer",
        RELEASE_PHASE: "before-publish",
        RELEASE_READ_ONLY: "1",
        RELEASE_TRIGGER_COMMIT: laterMainCommit,
      },
    });

    expect(stdout).toContain(`feishu-card-renderer@0.0.1 -> ${publishedCommit}`);
    expect(await readFile(output, "utf8")).toBe("should-publish=false\n");
  });
});
