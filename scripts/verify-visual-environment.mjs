import { constants } from "node:fs";
import { access, readFile, realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import { isAbsolute, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium as playwrightChromium } from "@playwright/test";

export const EXPECTED_PLAYWRIGHT_VERSION = "1.62.0";
export const EXPECTED_CHROMIUM_REVISION = "1234";
export const EXPECTED_CHROMIUM_VERSION = "151.0.7922.34";
export const EXPECTED_CHROMIUM_ARGS = Object.freeze([
  "--disable-skia-runtime-opts",
  "--disable-partial-raster",
]);

function contractViolation(message) {
  return new Error(`Visual environment contract violation: ${message}`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readChromiumProvenance({
  browsersPath,
  readTextFile = readFile,
}) {
  let source;
  try {
    source = await readTextFile(browsersPath, "utf8");
  } catch {
    throw contractViolation(
      "could not read Playwright browser provenance metadata",
    );
  }

  let metadata;
  try {
    metadata = JSON.parse(source);
  } catch {
    throw contractViolation(
      "Playwright browser provenance metadata is not valid JSON",
    );
  }

  if (!isRecord(metadata) || !Array.isArray(metadata.browsers)) {
    throw contractViolation(
      "Playwright browser provenance metadata must contain a browsers array",
    );
  }
  const chromium = metadata.browsers.find(
    (browser) => isRecord(browser) && browser.name === "chromium",
  );
  if (!chromium) {
    throw contractViolation(
      "Playwright browser provenance metadata does not contain a chromium entry",
    );
  }
  if (
    typeof chromium.revision !== "string"
    || chromium.revision.length === 0
  ) {
    throw contractViolation(
      "Playwright browser provenance metadata chromium revision must be a non-empty string",
    );
  }
  if (
    typeof chromium.browserVersion !== "string"
    || chromium.browserVersion.length === 0
  ) {
    throw contractViolation(
      "Playwright browser provenance metadata chromium browserVersion must be a non-empty string",
    );
  }

  return {
    revision: chromium.revision,
    browserVersion: chromium.browserVersion,
  };
}

export async function verifyVisualEnvironment(dependencies) {
  const {
    playwrightVersion,
    chromiumRevision,
    chromiumMetadataVersion,
    executablePath,
    accessExecutable,
    canonicalizePath,
    launchBrowser,
  } = dependencies;

  if (playwrightVersion !== EXPECTED_PLAYWRIGHT_VERSION) {
    throw contractViolation(
      `expected Playwright ${EXPECTED_PLAYWRIGHT_VERSION}, received ${playwrightVersion}`,
    );
  }
  if (chromiumRevision !== EXPECTED_CHROMIUM_REVISION) {
    throw contractViolation(
      `expected managed Chromium revision ${EXPECTED_CHROMIUM_REVISION}, received ${chromiumRevision}`,
    );
  }
  if (chromiumMetadataVersion !== EXPECTED_CHROMIUM_VERSION) {
    throw contractViolation(
      `expected Chromium metadata ${EXPECTED_CHROMIUM_VERSION}, received ${chromiumMetadataVersion}`,
    );
  }
  if (!isAbsolute(executablePath)) {
    throw contractViolation(
      `managed Chromium path must be absolute: ${executablePath}`,
    );
  }

  try {
    await accessExecutable(executablePath, constants.X_OK);
  } catch {
    throw contractViolation(
      `managed Chromium executable is not executable: ${executablePath}`,
    );
  }

  const canonicalPath = await canonicalizePath(executablePath);
  if (canonicalPath !== executablePath) {
    throw contractViolation(
      `managed Chromium path resolved to an unexpected executable: ${canonicalPath}`,
    );
  }

  let browser;
  try {
    browser = await launchBrowser({
      args: EXPECTED_CHROMIUM_ARGS,
      executablePath,
      headless: true,
    });
    const chromiumRuntimeVersion = browser.version();
    if (chromiumRuntimeVersion !== EXPECTED_CHROMIUM_VERSION) {
      throw contractViolation(
        `expected Chromium runtime ${EXPECTED_CHROMIUM_VERSION}, received ${chromiumRuntimeVersion}`,
      );
    }

    return {
      playwright: playwrightVersion,
      chromiumRevision,
      chromiumMetadataVersion,
      chromiumRuntimeVersion,
      chromiumArgs: EXPECTED_CHROMIUM_ARGS,
      chromiumExecutable: executablePath,
    };
  } finally {
    await browser?.close();
  }
}

export async function createDefaultVisualEnvironmentDependencies() {
  let playwrightPackage;
  let browsersPath;
  try {
    const require = createRequire(import.meta.url);
    const playwrightPackagePath = require.resolve(
      "@playwright/test/package.json",
    );
    playwrightPackage = require(playwrightPackagePath);
    const requireFromPlaywright = createRequire(playwrightPackagePath);
    const playwrightCoreRoot = dirname(
      requireFromPlaywright.resolve("playwright-core/package.json"),
    );
    browsersPath = resolve(playwrightCoreRoot, "browsers.json");
  } catch {
    throw contractViolation(
      "could not resolve installed Playwright provenance metadata",
    );
  }
  // browsers.json is private Playwright provenance metadata only. Runtime
  // authority remains executablePath(), canonicalization, launch, and version().
  const chromiumProvenance = await readChromiumProvenance({ browsersPath });

  return {
    playwrightVersion: playwrightPackage.version,
    chromiumRevision: chromiumProvenance.revision,
    chromiumMetadataVersion: chromiumProvenance.browserVersion,
    executablePath: playwrightChromium.executablePath(),
    accessExecutable: access,
    canonicalizePath: realpath,
    launchBrowser: (options) => playwrightChromium.launch(options),
  };
}

async function main() {
  const result = await verifyVisualEnvironment(
    await createDefaultVisualEnvironmentDependencies(),
  );
  console.log(JSON.stringify(result));
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error
      ? error.message
      : "Visual environment contract violation: unknown failure");
    process.exitCode = 1;
  }
}
