import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { chromium as playwrightChromium } from "@playwright/test";

const require = createRequire(import.meta.url);
const playwrightPackage = require("@playwright/test/package.json");
const requireFromPlaywright = createRequire(require.resolve("@playwright/test/package.json"));
const playwrightCoreRoot = dirname(requireFromPlaywright.resolve("playwright-core/package.json"));
const browsers = JSON.parse(
  await readFile(resolve(playwrightCoreRoot, "browsers.json"), "utf8"),
);
const chromium = browsers.browsers.find((browser) => browser.name === "chromium");

function fail(message) {
  throw new Error(`Visual environment contract violation: ${message}`);
}

if (playwrightPackage.version !== "1.62.0") {
  fail(`expected Playwright 1.62.0, received ${playwrightPackage.version}`);
}
if (!chromium || chromium.revision !== "1234") {
  fail(`expected managed Chromium revision 1234, received ${chromium?.revision ?? "missing"}`);
}
if (chromium.browserVersion !== "151.0.7922.34") {
  fail(`expected Chrome for Testing 151.0.7922.34, received ${chromium.browserVersion ?? "missing"}`);
}

const chromiumExecutable = playwrightChromium.executablePath();
if (process.env.CI) {
  await access(chromiumExecutable).catch(() => {
    fail(`managed Chromium is missing at ${chromiumExecutable}`);
  });
}

console.log(JSON.stringify({
  playwright: playwrightPackage.version,
  chromiumRevision: chromium.revision,
  chromiumVersion: chromium.browserVersion,
  chromiumExecutable,
}));
