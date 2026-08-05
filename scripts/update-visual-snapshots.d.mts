export type VisualUpdateEnvironment = {
  platform?: string;
  githubActions?: string;
  refreshAuthorized?: string;
};

export function assertVisualUpdateEnvironment(
  environment?: VisualUpdateEnvironment,
): void;

export function runVisualUpdate(options?: {
  spawn?: (
    command: string,
    args: string[],
    options: { stdio: "inherit" },
  ) => { status: number | null; error?: Error };
}): void;
