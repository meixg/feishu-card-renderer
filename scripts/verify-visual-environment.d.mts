export const EXPECTED_PLAYWRIGHT_VERSION: "1.62.0";
export const EXPECTED_CHROMIUM_REVISION: "1234";
export const EXPECTED_CHROMIUM_VERSION: "151.0.7922.34";
export const EXPECTED_CHROMIUM_ARGS: readonly [
  "--disable-skia-runtime-opts",
  "--disable-partial-raster",
];

export type VisualBrowser = {
  version(): string;
  close(): Promise<void>;
};

export type VisualEnvironmentDependencies = {
  playwrightVersion: string;
  chromiumRevision: string;
  chromiumMetadataVersion: string;
  executablePath: string;
  accessExecutable(path: string, mode: number): Promise<void>;
  canonicalizePath(path: string): Promise<string>;
  launchBrowser(options: {
    args: typeof EXPECTED_CHROMIUM_ARGS;
    executablePath: string;
    headless: true;
  }): Promise<VisualBrowser>;
};

export type VisualEnvironmentReport = {
  playwright: string;
  chromiumRevision: string;
  chromiumMetadataVersion: string;
  chromiumRuntimeVersion: string;
  chromiumArgs: typeof EXPECTED_CHROMIUM_ARGS;
  chromiumExecutable: string;
};

export function verifyVisualEnvironment(
  dependencies: VisualEnvironmentDependencies,
): Promise<VisualEnvironmentReport>;

export function createDefaultVisualEnvironmentDependencies():
  Promise<VisualEnvironmentDependencies>;

export function readChromiumProvenance(options: {
  browsersPath: string;
  readTextFile?(
    path: string,
    encoding: "utf8",
  ): Promise<string>;
}): Promise<{
  revision: string;
  browserVersion: string;
}>;
