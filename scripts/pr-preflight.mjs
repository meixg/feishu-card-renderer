import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function parsePreflightArguments(args) {
  if (args.length === 0) return { releaseSkip: false };
  if (args.length === 1 && args[0] === "--release-skip") {
    return { releaseSkip: true };
  }
  throw new Error("Usage: pnpm pr:preflight [--release-skip]");
}

export function preflightSteps({
  releaseSkip,
  platform,
  githubActions,
}) {
  const authoritativePixels = platform !== "linux" || githubActions === "true";
  return [
    ...releaseSkip ? [] : [[
      "pnpm",
      ["exec", "changeset", "status", "--since=origin/main"],
    ]],
    ["pnpm", ["typecheck"]],
    ["pnpm", ["lint"]],
    ["pnpm", ["workflows:verify"]],
    ["pnpm", ["unit"]],
    ["pnpm", ["component"]],
    ["pnpm", ["accessibility"]],
    ["pnpm", ["visual:environment"]],
    authoritativePixels
      ? ["pnpm", ["visual"]]
      : ["pnpm", ["exec", "playwright", "test", "--list"]],
  ];
}

export function runPreflight({ args = process.argv.slice(2), spawn = spawnSync } = {}) {
  const options = parsePreflightArguments(args);
  if (options.releaseSkip) {
    console.warn(
      "Skipping the local Changeset check does not authorize release:skip; "
      + "a maintainer must still add that GitHub label.",
    );
  }
  if (process.platform === "linux" && process.env.GITHUB_ACTIONS !== "true") {
    console.warn(
      "Workstation Linux is not pixel-authoritative; preflight will collect "
      + "the visual suite, while required CI performs screenshot comparison.",
    );
  }
  for (const [command, commandArgs] of preflightSteps({
    ...options,
    platform: process.platform,
    githubActions: process.env.GITHUB_ACTIONS,
  })) {
    const result = spawn(command, commandArgs, { stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(
        `${command} ${commandArgs.join(" ")} failed with exit code ${result.status}`,
      );
    }
  }
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    runPreflight();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "PR preflight failed");
    process.exitCode = 1;
  }
}
