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
      triggerCommit: commit,
    })).toEqual({
      state: "npm-unpublished",
      tagName: "feishu-card-renderer@0.0.2",
      sourceCommit: commit,
      repairTag: false,
      repairRelease: false,
    });
  });

  it("repairs only missing GitHub metadata after npm publication", () => {
    expect(planReleaseRecovery({
      version: "0.0.2",
      triggerCommit: commit,
      npm,
    })).toEqual({
      state: "npm-published-metadata-missing",
      tagName: "feishu-card-renderer@0.0.2",
      sourceCommit: commit,
      repairTag: true,
      repairRelease: true,
    });
    expect(planReleaseRecovery({
      version: "0.0.2",
      triggerCommit: commit,
      npm,
      tag,
    })).toMatchObject({ repairTag: false, repairRelease: true });
  });

  it("recognizes a complete cross-system record", () => {
    expect(planReleaseRecovery({
      version: "0.0.2",
      triggerCommit: commit,
      npm,
      tag,
      release,
    })).toMatchObject({ state: "consistent", repairTag: false, repairRelease: false });
  });

  it("allows only 0.0.1 to use the manual bootstrap provenance exception", () => {
    expect(planReleaseRecovery({
      version: "0.0.1",
      triggerCommit: "5dcc12a5f26819241ee1ebda8fb9824421fc021a",
      npm: { version: "0.0.1", latest: "0.0.1", gitHead: commit, provenance: false },
      tag: { name: "feishu-card-renderer@0.0.1", commit },
      release: { ...release, tagName: "feishu-card-renderer@0.0.1" },
    }).state).toBe("consistent");
    expect(() => planReleaseRecovery({
      version: "0.0.2",
      triggerCommit: commit,
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
      triggerCommit: commit,
      ...state,
    })).toThrow();
  });

  it("verifies an existing release by its npm source on later main pushes", () => {
    const laterMainCommit = "5dcc12a5f26819241ee1ebda8fb9824421fc021a";
    expect(planReleaseRecovery({
      version: "0.0.2",
      triggerCommit: laterMainCommit,
      npm,
      tag,
      release,
    })).toMatchObject({
      state: "consistent",
      sourceCommit: commit,
    });
  });

  it("fails closed when GitHub metadata exists before npm publication", () => {
    expect(() => planReleaseRecovery({
      version: "0.0.2",
      triggerCommit: commit,
      tag,
    })).toThrow("must not exist before npm publication");
  });
});
