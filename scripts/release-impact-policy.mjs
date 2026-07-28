export const RELEASE_SKIP_LABEL = "release:skip";
export const RELEASE_BRANCH = "changeset-release/main";

export function isChangesetsReleasePullRequest(pullRequest) {
  return pullRequest.baseRef === "main"
    && pullRequest.headRef === RELEASE_BRANCH
    && pullRequest.author === "github-actions[bot]";
}

export function evaluateReleaseImpact({
  hasChangeset,
  hasSkip,
  skipAuthorized,
  releasePullRequest,
}) {
  if (releasePullRequest) {
    return { ok: true, code: "release-pr-exempt" };
  }

  if (hasChangeset && hasSkip) {
    return { ok: false, code: "changeset-and-skip" };
  }
  if (hasChangeset) {
    return { ok: true, code: "changeset" };
  }
  if (hasSkip && skipAuthorized) {
    return { ok: true, code: "authorized-skip" };
  }
  if (hasSkip) {
    return { ok: false, code: "unauthorized-skip" };
  }
  return { ok: false, code: "missing-release-impact" };
}

export function findActiveSkipLabelEvent(events) {
  let activeEvent;
  for (const event of events) {
    if (event.label?.name !== RELEASE_SKIP_LABEL) continue;
    if (event.event === "labeled") activeEvent = event;
    if (event.event === "unlabeled") activeEvent = undefined;
  }
  return activeEvent;
}

export function isMaintainerPermission(permission) {
  return permission === "admin" || permission === "maintain";
}

export function validateChangesetDocument(source) {
  const match = /^---\r?\n"feishu-card-renderer": (patch|minor)\r?\n---\r?\n+([\s\S]+?)\s*$/.exec(source);
  if (!match) {
    return {
      ok: false,
      message: "Changeset 必须只声明 feishu-card-renderer 的 patch 或 minor 版本。",
    };
  }

  const summary = match[2].trim();
  if (summary.length < 12 || !/[\u3400-\u9fff]/u.test(summary)) {
    return {
      ok: false,
      message: "Changeset 摘要必须是面向消费者的中文说明（至少 12 个字符）。",
    };
  }
  return { ok: true, releaseType: match[1], summary };
}
