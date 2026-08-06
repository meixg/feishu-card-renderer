export function requireSingleMatch(
  files: string[],
  pattern: RegExp,
  label: string,
  directory: string,
): string;

export function collectStaticJavaScriptFiles(
  directory: string,
  entry?: string,
): Promise<string[]>;

export function measureBundleDirectory(directory: string): Promise<Record<
  string,
  { files: string[]; raw: number; gzip: number }
>>;

export function measureBundleComparison(
  baselineArgument: string,
  candidateArgument?: string,
): Promise<unknown>;
