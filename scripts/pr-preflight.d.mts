export type PreflightArguments = {
  releaseSkip: boolean;
};
export type PreflightOptions = PreflightArguments & {
  platform: string;
  githubActions: string | undefined;
};
export type PreflightStep = readonly [string, string[]];

export function parsePreflightArguments(args: string[]): PreflightArguments;
export function preflightSteps(options: PreflightOptions): PreflightStep[];
export function runPreflight(options?: {
  args?: string[];
  spawn?: (
    command: string,
    args: string[],
    options: { stdio: "inherit" },
  ) => { status: number | null; error?: Error };
}): void;
