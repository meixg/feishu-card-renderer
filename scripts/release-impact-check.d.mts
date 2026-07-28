export type PullRequestEvent = {
  pull_request?: {
    number?: number;
    base?: { ref?: string };
    head?: { ref?: string; sha?: string };
    user?: { login?: string };
  };
};

export type ReleaseImpactGitHub = {
  listPullRequestFiles(number: number, page: number, perPage: number): Promise<unknown>;
  listLabelEvents(number: number, page: number, perPage: number): Promise<unknown>;
  getActorPermission(login: string): Promise<unknown>;
  readFileAtRef(path: string, ref: string): Promise<unknown>;
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
