export type RegistryRelease = {
  version: string;
  latest: string;
  gitHead: string;
  provenance: boolean;
};

export type TagState = { name: string; commit: string };
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
  commit: string;
  npm?: RegistryRelease;
  tag?: TagState;
  release?: ReleaseState;
}): {
  state: "npm-unpublished" | "npm-published-metadata-missing" | "consistent";
  tagName: string;
  repairTag: boolean;
  repairRelease: boolean;
};
