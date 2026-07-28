export type ReleaseImpactInput = {
  hasChangeset: boolean;
  hasSkip: boolean;
  skipAuthorized: boolean;
  releasePullRequest: boolean;
};

export type PullRequestIdentity = {
  baseRef: string;
  headRef: string;
  author: string;
};

export type LabelEvent = {
  event?: string;
  label?: { name?: string };
  actor?: { login?: string };
};

export const RELEASE_SKIP_LABEL: "release:skip";
export const RELEASE_BRANCH: "changeset-release/main";
export function isChangesetsReleasePullRequest(pullRequest: PullRequestIdentity): boolean;
export function evaluateReleaseImpact(input: ReleaseImpactInput): {
  ok: boolean;
  code: string;
};
export function findActiveSkipLabelEvent(events: LabelEvent[]): LabelEvent | undefined;
export function isMaintainerPermission(permission: string): boolean;
export function isChangesetDocumentPath(file: string): boolean;
export function validateChangesetDocument(source: string):
  | { ok: true; releaseType: "patch" | "minor"; summary: string }
  | { ok: false; message: string };
