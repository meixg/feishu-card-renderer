import { constants } from "node:fs";
import { access, readFile, realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import { isAbsolute, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium as playwrightChromium } from "@playwright/test";

export const EXPECTED_PLAYWRIGHT_VERSION = "1.62.0";
export const EXPECTED_CHROMIUM_REVISION = "1234";
export const EXPECTED_CHROMIUM_VERSION = "151.0.7922.34";
export const EXPECTED_CHROMIUM_ARGS = [
  "--disable-skia-runtime-opts",
  "--disable-partial-raster",
];

function contractViolation(message) {
  return new Error(`Visual environment contract violation: ${message}`);
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
  const require = createRequire(import.meta.url);
  const playwrightPackage = require("@playwright/test/package.json");
  const requireFromPlaywright = createRequire(
    require.resolve("@playwright/test/package.json"),
  );
  const playwrightCoreRoot = dirname(
    requireFromPlaywright.resolve("playwright-core/package.json"),
  );
  const browsers = JSON.parse(
    await readFile(resolve(playwrightCoreRoot, "browsers.json"), "utf8"),
  );
  const chromium = browsers.browsers.find(
    (browser) => browser.name === "chromium",
  );

  return {
    playwrightVersion: playwrightPackage.version,
    chromiumRevision: chromium?.revision ?? "missing",
    chromiumMetadataVersion: chromium?.browserVersion ?? "missing",
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
  await main();
}
