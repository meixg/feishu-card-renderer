import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const workflowsDirectory = resolve(root, ".github/workflows");
const workflowFiles = (await readdir(workflowsDirectory))
  .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
  .sort();
const workflows = new Map(await Promise.all(workflowFiles.map(async (file) => [
  file,
  await readFile(resolve(workflowsDirectory, file), "utf8"),
])));

function requireContract(condition, message) {
  if (!condition) {
    throw new Error(`Workflow contract violation: ${message}`);
  }
}

function occurrences(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

for (const [file, source] of workflows) {
  const usesLines = source.match(/^\s*uses:\s*.+$/gm) ?? [];
  for (const line of usesLines) {
    requireContract(
      /^\s*uses:\s*[^@\s]+@[0-9a-f]{40}\s+#\s+v[0-9][^\s]*\s*$/.test(line),
      `${file} must pin every action to a 40-character SHA with a readable version comment: ${line.trim()}`,
    );
  }
}

const ci = workflows.get("ci.yml");
const pages = workflows.get("pages.yml");
const visualRefresh = workflows.get("visual-refresh.yml");
const releaseImpact = workflows.get("release-impact.yml");
const changesets = workflows.get("changesets.yml");
requireContract(ci, "ci.yml is required");
requireContract(pages, "pages.yml is required");
requireContract(visualRefresh, "visual-refresh.yml is required");
requireContract(releaseImpact, "release-impact.yml is required");
requireContract(changesets, "changesets.yml is required");

requireContract(
  /^on:\n {2}push:\n {4}branches: \["main"\]\n {2}pull_request:\n {4}branches: \["main"\]\n\npermissions:\n {2}contents: read\n/m.test(ci),
  "CI must trigger only on push main and pull_request main with read-only contents",
);
requireContract(!/\bpull_request_target\b/.test(ci), "CI must not use pull_request_target");
requireContract(!/^\s*paths(?:-ignore)?:/m.test(ci), "CI must not use path filters");
requireContract(!/^\s*workflow_dispatch:/m.test(ci), "required CI must not expose a dispatch bypass");
requireContract(!/^\s*[a-z-]+:\s*write\s*$/m.test(ci), "CI must not request write permissions");
requireContract(!/^\s*id-token:/m.test(ci), "CI must not request OIDC");

requireContract(
  /name: Package candidate \(Node \$\{\{ matrix\.node \}\}\)/.test(ci),
  "package candidate check name must remain stable",
);
requireContract(
  /node: \["22\.12\.0", "24"\]/.test(ci),
  "package candidate matrix must cover Node 22.12.0 and Node 24",
);
requireContract(
  occurrences(ci, /name: Full quality \(Node 24\)/g) === 1,
  "full-quality check name must remain stable and unique",
);
requireContract(
  occurrences(ci, /^\s*run: pnpm visual\s*$/gm) === 1,
  "required full-quality must run pnpm visual exactly once",
);
requireContract(!/\bvisual:update\b/.test(ci), "required CI must never update visual baselines");
requireContract(
  /name: Verify workflow safety contracts\n\s*run: pnpm workflows:verify/.test(ci),
  "Node 24 full-quality must execute the workflow verifier",
);

const playwrightConfig = await readFile(resolve(root, "playwright.config.ts"), "utf8");
requireContract(
  /name: "chromium"/.test(playwrightConfig),
  "Playwright must define the managed chromium project",
);
requireContract(
  !/channel:\s*["']chrome["']/.test(playwrightConfig),
  "Playwright must not select runner-provided Google Chrome",
);

const allAutomation = [...workflows.values()].join("\n");
requireContract(
  !/\b(?:NPM_TOKEN|NODE_AUTH_TOKEN)\b/.test(allAutomation),
  "automation must not expose npm token variables",
);
requireContract(!/\bnpm\s+publish\b/.test(allAutomation), "current workflows must not publish to npm");

requireContract(/^name: Deploy project site$/m.test(pages), "Pages must remain an independent workflow");
requireContract(/^permissions:\n {2}contents: read$/m.test(pages), "Pages build must default to contents read");
requireContract(
  /deploy:\n(?:.|\n)*?permissions:\n {6}pages: write\n {6}id-token: write/.test(pages),
  "Pages deploy must request only pages write and OIDC",
);
requireContract(
  /concurrency:\n {2}group: pages\n {2}cancel-in-progress: false/.test(pages),
  "Pages deployment must not be cancelled in progress",
);

requireContract(
  /^on:\n {2}workflow_dispatch:\n\npermissions:\n {2}contents: read\n/m.test(visualRefresh),
  "visual refresh must be workflow_dispatch-only with contents read",
);
requireContract(
  /name: Refresh visual baselines \(artifact only\)/.test(visualRefresh)
    && !/name: Full quality \(Node 24\)/.test(visualRefresh),
  "visual refresh must use a distinct non-required check name",
);
requireContract(
  occurrences(visualRefresh, /^\s*run: pnpm visual:update\s*$/gm) === 1,
  "visual refresh must regenerate snapshots exactly once",
);
requireContract(
  /uses: actions\/upload-artifact@[0-9a-f]{40}\s+#\s+v[0-9]/.test(visualRefresh),
  "visual refresh must upload its result as an artifact",
);
requireContract(
  !/^\s*[a-z-]+:\s*write\s*$/m.test(visualRefresh)
    && !/\b(?:git\s+push|gh\s+pr|npm\s+publish)\b/.test(visualRefresh),
  "visual refresh must not write repository or registry state",
);

requireContract(
  /^name: Release impact policy\n\non:\n {2}pull_request:\n {4}branches: \["main"\]\n {4}types: \[opened, synchronize, reopened, labeled, unlabeled\]\n\npermissions:\n {2}contents: read\n {2}pull-requests: read\n/m.test(releaseImpact),
  "release impact must use the read-only pull_request event for main",
);
requireContract(!/\bpull_request_target\b/.test(releaseImpact), "release impact must not use pull_request_target");
requireContract(!/^\s*[a-z-]+:\s*write\s*$/m.test(releaseImpact), "release impact must remain read-only");
requireContract(!/^\s*id-token:/m.test(releaseImpact), "release impact must not request OIDC");
requireContract(
  occurrences(releaseImpact, /name: Release impact$/gm) === 1,
  "release impact required check name must remain stable and unique",
);
requireContract(
  /run: node scripts\/check-release-impact\.mjs/.test(releaseImpact),
  "release impact must execute the tested policy seam",
);
requireContract(
  /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/.test(releaseImpact),
  "release impact must explicitly inspect the pull request head in its read-only context",
);

requireContract(
  /^on:\n {2}push:\n {4}branches: \["main"\]\n\npermissions:\n {2}contents: write\n {2}pull-requests: write\n/m.test(changesets),
  "Changesets maintenance must run only on trusted main with contents and pull-request writes",
);
requireContract(!/\bpull_request(?:_target)?\b/.test(changesets), "Changesets maintenance must never run on pull requests");
requireContract(!/^\s*id-token:/m.test(changesets), "Changesets maintenance must not request OIDC");
requireContract(
  /uses: changesets\/action@[0-9a-f]{40}\s+#\s+v1\.8\.0/.test(changesets),
  "Changesets action must be pinned to the audited v1.8.0 commit",
);
requireContract(
  /commitMode: github-api/.test(changesets)
    && /prDraft: create/.test(changesets)
    && /createGithubReleases: false/.test(changesets)
    && /GITHUB_TOKEN: \$\{\{ github\.token \}\}/.test(changesets),
  "Changesets must use GitHub API commits, draft PR creation, no releases, and the built-in token",
);
requireContract(
  /group: changesets-release-pr\n {2}cancel-in-progress: false/.test(changesets),
  "Changesets must serialize maintenance of its single release PR",
);
requireContract(
  !/\b(?:publish:|npm\s+publish|changeset\s+publish|NPM_TOKEN|NODE_AUTH_TOKEN)\b/.test(changesets),
  "Changesets maintenance must not publish or receive registry credentials",
);

requireContract(
  /^ {2}pull_request:\n {4}branches: \["main"\]$/m.test(ci)
    && !/\b(?:changeset-release\/main|release-pr-exempt)\b/.test(ci),
  "the Release PR exception must not bypass any existing CI check",
);

for (const [file, source] of workflows) {
  if (/\bnpm\s+publish\b/.test(source)) {
    requireContract(
      /concurrency:\n(?:.|\n)*?cancel-in-progress: false/.test(source),
      `${file} publishes and must set concurrency cancel-in-progress to false`,
    );
  }
}

console.log(`Workflow contracts verified across ${workflowFiles.length} workflows.`);
