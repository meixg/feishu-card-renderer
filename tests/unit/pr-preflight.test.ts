import { describe, expect, it, vi } from "vitest";

import {
  parsePreflightArguments,
  preflightSteps,
  runPreflight,
} from "../../scripts/pr-preflight.mjs";

describe("PR preflight", () => {
  it("runs complete non-pixel checks and collects visuals on workstation Linux", () => {
    expect(preflightSteps({
      releaseSkip: false,
      platform: "linux",
      githubActions: undefined,
    })).toEqual([
      ["pnpm", ["exec", "changeset", "status", "--since=origin/main"]],
      ["pnpm", ["typecheck"]],
      ["pnpm", ["lint"]],
      ["pnpm", ["workflows:verify"]],
      ["pnpm", ["unit"]],
      ["pnpm", ["component"]],
      ["pnpm", ["accessibility"]],
      ["pnpm", ["visual:environment"]],
      ["pnpm", ["exec", "playwright", "test", "--list"]],
    ]);
  });

  it("runs authoritative pixel comparison in GitHub Actions", () => {
    expect(preflightSteps({
      releaseSkip: false,
      platform: "linux",
      githubActions: "true",
    }).at(-1)).toEqual(["pnpm", ["visual"]]);
  });

  it("supports an explicit maintenance-only skip without hiding quality checks", () => {
    expect(parsePreflightArguments(["--release-skip"]))
      .toEqual({ releaseSkip: true });
    expect(preflightSteps({
      releaseSkip: true,
      platform: "linux",
      githubActions: undefined,
    })[0]).toEqual(["pnpm", ["typecheck"]]);
  });

  it("stops at the first failed command", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const spawn = vi.fn()
      .mockReturnValueOnce({ status: 0 })
      .mockReturnValueOnce({ status: 1 });

    expect(() => runPreflight({ args: [], spawn }))
      .toThrow("pnpm typecheck failed with exit code 1");
    expect(spawn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("rejects ambiguous arguments", () => {
    expect(() => parsePreflightArguments(["--skip-tests"]))
      .toThrow("Usage: pnpm pr:preflight [--release-skip]");
  });
});
