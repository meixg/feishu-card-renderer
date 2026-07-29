export type RegistryRelease = {
  version: string;
  latest: string;
  gitHead: string;
  provenance: boolean;
};

export type TagState = {
  name: string;
  commit: string;
  kind: "lightweight" | "annotated";
};
export type SourceVerification = {
  sha: string;
  verified: boolean;
  reason: string;
};
export type ReleaseState = {
  tagName: string;
  draft: boolean;
  prerelease: boolean;
  assets: readonly unknown[];
};

export const PACKAGE_NAME: "feishu-card-renderer";
export const BOOTSTRAP_VERSION: "0.0.1";
export function expectedTag(version: string): string;
export function planReleaseRecovery(input: {
  version: string;
  triggerCommit: string;
  sourcePolicy: "current-workflow" | "existing-release";
  npm?: RegistryRelease;
  tag?: TagState;
  release?: ReleaseState;
  sourceVerification?: SourceVerification;
}): {
  state: "npm-unpublished" | "npm-published-metadata-missing" | "consistent";
  tagName: string;
  sourceCommit: string;
  repairTag: boolean;
  repairRelease: boolean;
};
