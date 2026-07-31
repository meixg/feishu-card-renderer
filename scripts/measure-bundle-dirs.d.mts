export function requireSingleMatch(
  files: string[],
  pattern: RegExp,
  label: string,
  directory: string,
): string;

export function measureBundleDirectory(directory: string): Promise<Record<
  string,
  { file: string; raw: number; gzip: number }
>>;

export function measureBundleComparison(
  baselineArgument: string,
  candidateArgument?: string,
): Promise<unknown>;
