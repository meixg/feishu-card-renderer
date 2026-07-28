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
const CONSUMER_DEPENDENCY_FIELDS = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
  "peerDependenciesMeta",
];

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
    || !pullRequest?.base?.sha
    || !REPOSITORY_FULL_NAME.test(pullRequest?.base?.repo?.full_name)
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

function consumerDependencyManifest(source, ref) {
  if (typeof source !== "string") {
    throw new Error(`GitHub API 未返回 ${ref} package.json 的文本内容。`);
  }
  let manifest;
  try {
    manifest = JSON.parse(source);
  } catch {
    throw new Error(`${ref} package.json 不是合法 JSON。`);
  }
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(`${ref} package.json 必须是 JSON 对象。`);
  }
  return Object.fromEntries(CONSUMER_DEPENDENCY_FIELDS.map((field) => [
    field,
    canonicalizeJson(manifest[field]),
  ]));
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, canonicalizeJson(nested)]));
  }
  return value;
}

function consumerDependenciesChanged(baseSource, headSource) {
  const base = consumerDependencyManifest(baseSource, "base");
  const head = consumerDependencyManifest(headSource, "head");
  return JSON.stringify(base) !== JSON.stringify(head);
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
  const rootManifestChanged = files.some((file) => file?.filename === "package.json");

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

  if (rootManifestChanged) {
    const [baseManifest, headManifest] = await Promise.all([
      github.readFileAtRef(
        pullRequest.base.repo.full_name,
        "package.json",
        pullRequest.base.sha,
      ),
      github.readFileAtRef(
        pullRequest.head.repo.full_name,
        "package.json",
        pullRequest.head.sha,
      ),
    ]);
    if (
      consumerDependenciesChanged(baseManifest, headManifest)
      && changesetPaths.length === 0
    ) {
      return { ok: false, code: "consumer-dependency-requires-changeset" };
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
