import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";

import {
  collectStaticJavaScriptFiles,
  requireSingleMatch,
} from "../../scripts/measure-bundle-dirs.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => (
    rm(directory, { recursive: true, force: true })
  )));
});

it("fails clearly when a required bundle chunk has no match", () => {
  expect(() => requireSingleMatch(
    ["index.js", "styles.css"],
    /^index-.*\.js$/u,
    "hashed shared index chunk",
    "dist",
  )).toThrow(
    "dist: expected exactly one hashed shared index chunk, found 0",
  );
});

it("fails clearly instead of silently measuring the first of multiple chunks", () => {
  expect(() => requireSingleMatch(
    ["index-a.js", "index-b.js", "styles.css"],
    /^index-.*\.js$/u,
    "hashed shared index chunk",
    "dist",
  )).toThrow(
    "dist: expected exactly one hashed shared index chunk, found 2"
    + " (index-a.js, index-b.js)",
  );
});

it("returns the sole semantic chunk match", () => {
  expect(requireSingleMatch(
    ["index.js", "index-reviewed.js", "styles.css"],
    /^index-.*\.js$/u,
    "hashed shared index chunk",
    "dist",
  )).toBe("index-reviewed.js");
});

it("collects every static eager chunk without depending on Rollup chunk names", async () => {
  const directory = await mkdtemp(join(tmpdir(), "bundle-closure-"));
  temporaryDirectories.push(directory);
  await Promise.all([
    writeFile(join(directory, "index.js"), [
      'import "./rolldown-runtime-a.js";',
      'export { value } from "./normalize-b.js";',
      'export const lazy = () => import("./vchart-runtime-c.js");',
    ].join("\n")),
    writeFile(join(directory, "rolldown-runtime-a.js"), "export const runtime = true;"),
    writeFile(join(directory, "normalize-b.js"), "export const value = true;"),
    writeFile(join(directory, "vchart-runtime-c.js"), "export const chart = true;"),
  ]);

  await expect(collectStaticJavaScriptFiles(directory)).resolves.toEqual([
    "index.js",
    "normalize-b.js",
    "rolldown-runtime-a.js",
  ]);
});
