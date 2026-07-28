import {
  evaluateReleaseImpact,
  findActiveSkipLabelEvent,
  isChangesetDocumentPath,
  isChangesetsReleasePullRequest,
  isMaintainerPermission,
  validateChangesetDocument,
} from "./release-impact-policy.mjs";

const PAGE_SIZE = 100;
const REPOSITORY_FULL_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u;

async function collectPages(loadPage) {
  const items = [];
  for (let page = 1; ; page += 1) {
    const batch = await loadPage(page);
    if (!Array.isArray(batch)) {
      throw new Error("GitHub API 返回了无效的分页数据。");
    }
    items.push(...batch);
    if (batch.length < PAGE_SIZE) return items;
  }
}

function pullRequestIdentity(event) {
  const pullRequest = event?.pull_request;
  if (
    !pullRequest?.base?.ref
    || !pullRequest?.head?.ref
    || !pullRequest?.head?.sha
    || !REPOSITORY_FULL_NAME.test(pullRequest?.head?.repo?.full_name)
    || !pullRequest?.user?.login
    || !Number.isInteger(pullRequest.number)
  ) {
    throw new Error("pull_request 事件缺少或包含非法的必要身份数据。");
  }
  return pullRequest;
}

export async function assessReleaseImpact({ event, github }) {
  const pullRequest = pullRequestIdentity(event);
  const releasePullRequest = isChangesetsReleasePullRequest({
    baseRef: pullRequest.base.ref,
    headRef: pullRequest.head.ref,
    author: pullRequest.user.login,
  });

  if (releasePullRequest) {
    return evaluateReleaseImpact({
      hasChangeset: false,
      hasSkip: false,
      skipAuthorized: false,
      releasePullRequest: true,
    });
  }

  const files = await collectPages((page) => github.listPullRequestFiles(
    pullRequest.number,
    page,
    PAGE_SIZE,
  ));
  const changesetPaths = files
    .filter((file) => file?.status !== "removed" && isChangesetDocumentPath(file?.filename))
    .map((file) => file.filename);

  for (const path of changesetPaths) {
    const source = await github.readFileAtRef(
      pullRequest.head.repo.full_name,
      path,
      pullRequest.head.sha,
    );
    if (typeof source !== "string") {
      throw new Error(`GitHub API 未返回 ${path} 的文本内容。`);
    }
    const validation = validateChangesetDocument(source);
    if (!validation.ok) {
      return { ok: false, code: "invalid-changeset", path, message: validation.message };
    }
  }

  const events = await collectPages((page) => github.listLabelEvents(
    pullRequest.number,
    page,
    PAGE_SIZE,
  ));
  const skipEvent = findActiveSkipLabelEvent(events);
  let skipAuthorized = false;
  if (skipEvent) {
    const actor = skipEvent.actor?.login;
    if (typeof actor === "string" && actor.length > 0) {
      const permission = await github.getActorPermission(actor);
      if (typeof permission !== "string") {
        throw new Error("GitHub API 未返回标签操作者权限。");
      }
      skipAuthorized = isMaintainerPermission(permission);
    }
  }

  return evaluateReleaseImpact({
    hasChangeset: changesetPaths.length > 0,
    hasSkip: Boolean(skipEvent),
    skipAuthorized,
    releasePullRequest: false,
  });
}
