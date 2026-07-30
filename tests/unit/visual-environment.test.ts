import { constants } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  EXPECTED_CHROMIUM_REVISION,
  EXPECTED_CHROMIUM_ARGS,
  EXPECTED_CHROMIUM_VERSION,
  EXPECTED_PLAYWRIGHT_VERSION,
  verifyVisualEnvironment,
  type VisualEnvironmentDependencies,
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
});
