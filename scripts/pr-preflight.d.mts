export type PreflightOptions = {
  releaseSkip: boolean;
  platform?: string;
  githubActions?: string;
};
export type PreflightStep = readonly [string, string[]];

export function parsePreflightArguments(args: string[]): PreflightOptions;
export function preflightSteps(options: PreflightOptions): PreflightStep[];
export function runPreflight(options?: {
  args?: string[];
  spawn?: (
    command: string,
    args: string[],
    options: { stdio: "inherit" },
  ) => { status: number | null; error?: Error };
}): void;
