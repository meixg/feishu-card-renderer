import { expect, it } from "vitest";

import {
  requireSingleMatch,
} from "../../scripts/measure-bundle-dirs.mjs";

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
