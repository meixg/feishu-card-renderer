import { constants } from "node:fs";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  EXPECTED_CHROMIUM_REVISION,
  EXPECTED_CHROMIUM_ARGS,
  EXPECTED_CHROMIUM_VERSION,
  EXPECTED_PLAYWRIGHT_VERSION,
  readChromiumProvenance,
  verifyVisualEnvironment,
  type VisualEnvironmentDependencies,
  type VisualEnvironmentReport,
} from "../../scripts/verify-visual-environment.mjs";

function validDependencies(
  overrides: Partial<VisualEnvironmentDependencies> = {},
): VisualEnvironmentDependencies {
  return {
    playwrightVersion: EXPECTED_PLAYWRIGHT_VERSION,
    chromiumRevision: EXPECTED_CHROMIUM_REVISION,
    chromiumMetadataVersion: EXPECTED_CHROMIUM_VERSION,
    executablePath: "/managed/chromium",
    accessExecutable: vi.fn(async () => undefined),
    canonicalizePath: vi.fn(async (path) => path),
    launchBrowser: vi.fn(async () => ({
      version: () => EXPECTED_CHROMIUM_VERSION,
      close: vi.fn(async () => undefined),
    })),
    ...overrides,
  };
}

describe("visual environment contract", () => {
  it("declares the ordered Chromium arguments as an exact readonly tuple", () => {
    expectTypeOf<VisualEnvironmentReport["chromiumArgs"][1]>()
      .toEqualTypeOf<"--disable-partial-raster">();
    expectTypeOf<VisualEnvironmentReport["chromiumArgs"]>()
      .toEqualTypeOf<readonly [
        "--disable-skia-runtime-opts",
        "--disable-partial-raster",
      ]>();
    expect(EXPECTED_CHROMIUM_ARGS).toEqual([
      "--disable-skia-runtime-opts",
      "--disable-partial-raster",
    ]);
  });

  it("launches the managed executable and verifies its runtime version", async () => {
    const close = vi.fn(async () => undefined);
    const launchBrowser = vi.fn(async () => ({
      version: () => EXPECTED_CHROMIUM_VERSION,
      close,
    }));
    const accessExecutable = vi.fn(async () => undefined);

    await expect(verifyVisualEnvironment(validDependencies({
      accessExecutable,
      launchBrowser,
    }))).resolves.toEqual({
      playwright: EXPECTED_PLAYWRIGHT_VERSION,
      chromiumRevision: EXPECTED_CHROMIUM_REVISION,
      chromiumMetadataVersion: EXPECTED_CHROMIUM_VERSION,
      chromiumRuntimeVersion: EXPECTED_CHROMIUM_VERSION,
      chromiumArgs: EXPECTED_CHROMIUM_ARGS,
      chromiumExecutable: "/managed/chromium",
    });

    expect(accessExecutable).toHaveBeenCalledWith(
      "/managed/chromium",
      constants.X_OK,
    );
    expect(launchBrowser).toHaveBeenCalledWith({
      args: EXPECTED_CHROMIUM_ARGS,
      executablePath: "/managed/chromium",
      headless: true,
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it("rejects a missing managed executable before launch", async () => {
    const launchBrowser = vi.fn();

    await expect(verifyVisualEnvironment(validDependencies({
      accessExecutable: vi.fn(async () => {
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      }),
      launchBrowser,
    }))).rejects.toThrow(
      "managed Chromium executable is not executable: /managed/chromium",
    );
    expect(launchBrowser).not.toHaveBeenCalled();
  });

  it("rejects a forged relative executable path", async () => {
    await expect(verifyVisualEnvironment(validDependencies({
      executablePath: "chromium",
    }))).rejects.toThrow(
      "managed Chromium path must be absolute: chromium",
    );
  });

  it("rejects a replaced executable reached through a different canonical path", async () => {
    await expect(verifyVisualEnvironment(validDependencies({
      canonicalizePath: vi.fn(async () => "/tmp/replacement/chromium"),
    }))).rejects.toThrow(
      "managed Chromium path resolved to an unexpected executable",
    );
  });

  it("rejects a replacement binary with the wrong runtime version and closes it", async () => {
    const close = vi.fn(async () => undefined);

    await expect(verifyVisualEnvironment(validDependencies({
      launchBrowser: vi.fn(async () => ({
        version: () => "150.0.0.0",
        close,
      })),
    }))).rejects.toThrow(
      `expected Chromium runtime ${EXPECTED_CHROMIUM_VERSION}, received 150.0.0.0`,
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("rejects forged Playwright browser metadata without launching", async () => {
    const launchBrowser = vi.fn();

    await expect(verifyVisualEnvironment(validDependencies({
      chromiumRevision: "forged",
      launchBrowser,
    }))).rejects.toThrow(
      `expected managed Chromium revision ${EXPECTED_CHROMIUM_REVISION}, received forged`,
    );
    expect(launchBrowser).not.toHaveBeenCalled();
  });

  it("rejects a non-empty mismatched Chromium metadata version before launch", async () => {
    const launchBrowser = vi.fn();

    const error = await verifyVisualEnvironment(validDependencies({
      chromiumMetadataVersion: "150.0.0.0",
      launchBrowser,
    })).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      `Visual environment contract violation: expected Chromium metadata ${EXPECTED_CHROMIUM_VERSION}, received 150.0.0.0`,
    );
    expect((error as Error).message).not.toMatch(/\n|\bat\s|stack|cause/i);
    expect((error as Error).cause).toBeUndefined();
    expect(launchBrowser).not.toHaveBeenCalled();
  });

  it("reports a missing private provenance file as a contract violation", async () => {
    await expect(readChromiumProvenance({
      browsersPath: "/private/playwright/browsers.json",
      readTextFile: vi.fn(async () => {
        throw Object.assign(new Error("ENOENT stack must not escape"), {
          code: "ENOENT",
        });
      }),
    })).rejects.toThrow(
      "Visual environment contract violation: could not read Playwright browser provenance metadata",
    );
    await expect(readChromiumProvenance({
      browsersPath: "/private/playwright/browsers.json",
      readTextFile: vi.fn(async () => {
        throw new Error("secret original failure");
      }),
    })).rejects.not.toThrow("secret original failure");
  });

  it("reports malformed private provenance JSON without leaking the parser error", async () => {
    const promise = readChromiumProvenance({
      browsersPath: "/private/playwright/browsers.json",
      readTextFile: vi.fn(async () => "{not-json"),
    });

    await expect(promise).rejects.toThrow(
      "Visual environment contract violation: Playwright browser provenance metadata is not valid JSON",
    );
    await expect(promise).rejects.not.toThrow("Unexpected token");
  });

  it.each([
    ["missing browser list", {}],
    ["non-array browser list", { browsers: {} }],
    ["missing Chromium entry", { browsers: [{ name: "firefox" }] }],
    ["missing revision", {
      browsers: [{ name: "chromium", browserVersion: EXPECTED_CHROMIUM_VERSION }],
    }],
    ["missing browser version", {
      browsers: [{ name: "chromium", revision: EXPECTED_CHROMIUM_REVISION }],
    }],
  ])("reports wrong provenance shape: %s", async (_label, metadata) => {
    await expect(readChromiumProvenance({
      browsersPath: "/private/playwright/browsers.json",
      readTextFile: vi.fn(async () => JSON.stringify(metadata)),
    })).rejects.toThrow(
      "Visual environment contract violation: Playwright browser provenance metadata",
    );
  });
});
