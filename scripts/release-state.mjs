export const PACKAGE_NAME = "feishu-card-renderer";
export const BOOTSTRAP_VERSION = "0.0.1";

export function expectedTag(version) {
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) {
    throw new Error("package version is not a supported release version");
  }
  return `${PACKAGE_NAME}@${version}`;
}

export function planReleaseRecovery({
  version,
  triggerCommit,
  sourcePolicy,
  npm,
  tag,
  release,
  sourceVerification,
}) {
  const tagName = expectedTag(version);
  if (!/^[0-9a-f]{40}$/u.test(triggerCommit)) {
    throw new Error("release trigger commit must be a full SHA");
  }

  if (sourcePolicy !== "current-workflow" && sourcePolicy !== "existing-release") {
    throw new Error("release source policy is invalid");
  }

  if (!npm) {
    if (sourcePolicy === "existing-release") {
      throw new Error("a previously published version disappeared from npm");
    }
    if (tag || release) {
      throw new Error("GitHub metadata must not exist before npm publication");
    }
    if (
      sourceVerification?.sha !== triggerCommit
      || sourceVerification.verified !== true
    ) {
      throw new Error("the release commit must be verified by GitHub");
    }
    return {
      state: "npm-unpublished",
      tagName,
      sourceCommit: triggerCommit,
      repairTag: false,
      repairRelease: false,
    };
  }
  if (npm.version !== version || !/^[0-9a-f]{40}$/u.test(npm.gitHead)) {
    throw new Error("published npm version does not contain a valid source commit");
  }
  const sourceCommit = npm.gitHead;
  const manualBootstrap = version === BOOTSTRAP_VERSION
    && sourcePolicy === "existing-release";
  if (sourcePolicy === "current-workflow" && sourceCommit !== triggerCommit) {
    throw new Error("this workflow publication does not point to its trigger commit");
  }
  if (
    sourceVerification?.sha !== sourceCommit
    || sourceVerification.verified !== true
  ) {
    throw new Error("the release commit must be verified by GitHub");
  }
  if (npm.latest !== version) {
    throw new Error("npm latest does not match the release version");
  }
  if (!manualBootstrap && !npm.provenance) {
    throw new Error("an automated npm release must include provenance");
  }
  if (tag && (
    tag.name !== tagName
    || tag.commit !== sourceCommit
    || (!manualBootstrap && tag.kind !== "lightweight")
  )) {
    throw new Error("the immutable release tag points to a different source commit");
  }
  if (release && (
    release.tagName !== tagName
    || release.draft
    || release.prerelease
    || release.assets.length !== 0
  )) {
    throw new Error("GitHub Release metadata does not match the release contract");
  }

  const repairTag = !tag;
  const repairRelease = !release;
  return {
    state: repairTag || repairRelease ? "npm-published-metadata-missing" : "consistent",
    tagName,
    sourceCommit,
    repairTag,
    repairRelease,
  };
}
