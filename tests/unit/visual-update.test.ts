import { describe, expect, it, vi } from "vitest";

import {
  assertVisualUpdateEnvironment,
  runVisualUpdate,
} from "../../scripts/update-visual-snapshots.mjs";

describe("visual snapshot update guard", () => {
  it("rejects workstation Linux even when the managed browser matches", () => {
    expect(() => assertVisualUpdateEnvironment({
      platform: "linux",
      githubActions: undefined,
      refreshAuthorized: undefined,
    })).toThrow("Visual baseline refresh GitHub Actions workflow");
  });

  it("allows only the explicitly authorized GitHub refresh job on Linux", () => {
    expect(() => assertVisualUpdateEnvironment({
      platform: "linux",
      githubActions: "true",
      refreshAuthorized: "1",
    })).not.toThrow();
    expect(() => assertVisualUpdateEnvironment({
      platform: "linux",
      githubActions: "true",
      refreshAuthorized: undefined,
    })).toThrow();
  });

  it("runs Playwright snapshot regeneration without a shell", () => {
    const spawn = vi.fn(() => ({ status: 0 }));
    vi.stubEnv("GITHUB_ACTIONS", "true");
    vi.stubEnv("FCR_VISUAL_REFRESH", "1");

    runVisualUpdate({ spawn });

    expect(spawn).toHaveBeenCalledWith(
      "pnpm",
      ["exec", "playwright", "test", "--update-snapshots"],
      { stdio: "inherit" },
    );
    vi.unstubAllEnvs();
  });
});
