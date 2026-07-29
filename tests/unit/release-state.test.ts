import { describe, expect, it } from "vitest";
import { planReleaseRecovery } from "../../scripts/release-state.mjs";

const commit = "2c266266a8e0164ddc711d116c5844848eef3660";
const npm = {
  version: "0.0.2",
  latest: "0.0.2",
  gitHead: commit,
  provenance: true,
};
const tag = { name: "feishu-card-renderer@0.0.2", commit };
const release = {
  tagName: "feishu-card-renderer@0.0.2",
  draft: false,
  prerelease: false,
  assets: [],
};

describe("release recovery state", () => {
  it("keeps an unpublished version distinct and forbids metadata repair", () => {
    expect(planReleaseRecovery({
      version: "0.0.2",
      commit,
    })).toEqual({
      state: "npm-unpublished",
      tagName: "feishu-card-renderer@0.0.2",
      repairTag: false,
      repairRelease: false,
    });
  });

  it("repairs only missing GitHub metadata after npm publication", () => {
    expect(planReleaseRecovery({
      version: "0.0.2",
      commit,
      npm,
    })).toEqual({
      state: "npm-published-metadata-missing",
      tagName: "feishu-card-renderer@0.0.2",
      repairTag: true,
      repairRelease: true,
    });
    expect(planReleaseRecovery({
      version: "0.0.2",
      commit,
      npm,
      tag,
    })).toMatchObject({ repairTag: false, repairRelease: true });
  });

  it("recognizes a complete cross-system record", () => {
    expect(planReleaseRecovery({
      version: "0.0.2",
      commit,
      npm,
      tag,
      release,
    })).toMatchObject({ state: "consistent", repairTag: false, repairRelease: false });
  });

  it("allows only 0.0.1 to use the manual bootstrap provenance exception", () => {
    expect(planReleaseRecovery({
      version: "0.0.1",
      commit,
      npm: { version: "0.0.1", latest: "0.0.1", gitHead: commit, provenance: false },
      tag: { name: "feishu-card-renderer@0.0.1", commit },
      release: { ...release, tagName: "feishu-card-renderer@0.0.1" },
    }).state).toBe("consistent");
    expect(() => planReleaseRecovery({
      version: "0.0.2",
      commit,
      npm: { ...npm, provenance: false },
      tag,
      release,
    })).toThrow("must include provenance");
  });

  it.each([
    ["npm source", { npm: { ...npm, gitHead: "a".repeat(40) }, tag, release }],
    ["latest", { npm: { ...npm, latest: "0.0.1" }, tag, release }],
    ["tag source", { npm, tag: { ...tag, commit: "a".repeat(40) }, release }],
    ["release assets", { npm, tag, release: { ...release, assets: [{}] } }],
  ])("fails closed on conflicting %s metadata", (_name, state) => {
    expect(() => planReleaseRecovery({
      version: "0.0.2",
      commit,
      ...state,
    })).toThrow();
  });
});
