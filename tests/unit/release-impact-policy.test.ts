import { describe, expect, it } from "vitest";
import {
  evaluateReleaseImpact,
  findActiveSkipLabelEvent,
  isChangesetDocumentPath,
  isChangesetsReleasePullRequest,
  isMaintainerPermission,
  validateChangesetDocument,
} from "../../scripts/release-impact-policy.mjs";

describe("release impact policy", () => {
  it.each([
    ["有效 Changeset", { hasChangeset: true, hasSkip: false, skipAuthorized: false, releasePullRequest: false }, true, "changeset"],
    ["有效 skip", { hasChangeset: false, hasSkip: true, skipAuthorized: true, releasePullRequest: false }, true, "authorized-skip"],
    ["两者皆无", { hasChangeset: false, hasSkip: false, skipAuthorized: false, releasePullRequest: false }, false, "missing-release-impact"],
    ["两者并存", { hasChangeset: true, hasSkip: true, skipAuthorized: true, releasePullRequest: false }, false, "changeset-and-skip"],
    ["未授权 skip", { hasChangeset: false, hasSkip: true, skipAuthorized: false, releasePullRequest: false }, false, "unauthorized-skip"],
    ["Changesets Release PR", { hasChangeset: false, hasSkip: false, skipAuthorized: false, releasePullRequest: true }, true, "release-pr-exempt"],
  ])("%s", (_name, input, ok, code) => {
    expect(evaluateReleaseImpact(input)).toEqual({ ok, code });
  });

  it("only identifies the standard bot-owned release pull request", () => {
    expect(isChangesetsReleasePullRequest({
      baseRef: "main",
      headRef: "changeset-release/main",
      author: "github-actions[bot]",
    })).toBe(true);
    expect(isChangesetsReleasePullRequest({
      baseRef: "main",
      headRef: "changeset-release/main",
      author: "outside-contributor",
    })).toBe(false);
  });

  it("derives skip authorization from the latest auditable label event", () => {
    const labeled = {
      event: "labeled",
      label: { name: "release:skip" },
      actor: { login: "maintainer" },
    };
    expect(findActiveSkipLabelEvent([labeled])).toBe(labeled);
    expect(findActiveSkipLabelEvent([
      labeled,
      { event: "unlabeled", label: { name: "release:skip" } },
    ])).toBeUndefined();
    expect(isMaintainerPermission("maintain")).toBe(true);
    expect(isMaintainerPermission("admin")).toBe(true);
    expect(isMaintainerPermission("write")).toBe(false);
  });

  it("recognizes Changeset documents without treating Changesets README as one", () => {
    expect(isChangesetDocumentPath(".changeset/friendly-bats.md")).toBe(true);
    expect(isChangesetDocumentPath(".changeset/README.md")).toBe(false);
    expect(isChangesetDocumentPath(".changeset/config.json")).toBe(false);
  });
});

describe("Changeset consumer summary contract", () => {
  it("accepts a consumer-facing Chinese summary", () => {
    expect(validateChangesetDocument(`---
"feishu-card-renderer": minor
---

新增公开的卡片渲染能力，并说明消费者如何启用。
`)).toMatchObject({ ok: true, releaseType: "minor" });
  });

  it.each([
    ["非中文摘要", `---\n"feishu-card-renderer": patch\n---\n\nFix internal renderer behavior.`],
    ["错误包名", `---\n"another-package": patch\n---\n\n修复消费者可见的渲染问题。`],
    ["0.x major", `---\n"feishu-card-renderer": major\n---\n\n调整消费者依赖的公开契约。`],
  ])("rejects %s", (_name, source) => {
    expect(validateChangesetDocument(source).ok).toBe(false);
  });
});
