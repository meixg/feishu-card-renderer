export type PullRequestEvent = {
  pull_request?: {
    number?: number;
    base?: { ref?: string };
    head?: {
      ref?: string;
      sha?: string;
      repo?: { full_name?: string };
    };
    user?: { login?: string };
  };
};

export type ReleaseImpactGitHub = {
  listPullRequestFiles(number: number, page: number, perPage: number): Promise<unknown>;
  listLabelEvents(number: number, page: number, perPage: number): Promise<unknown>;
  getActorPermission(login: string): Promise<unknown>;
  readFileAtRef(headRepo: string, path: string, headSha: string): Promise<unknown>;
};

export function assessReleaseImpact(input: {
  event: PullRequestEvent;
  github: ReleaseImpactGitHub;
}): Promise<{
  ok: boolean;
  code: string;
  path?: string;
  message?: string;
}>;
