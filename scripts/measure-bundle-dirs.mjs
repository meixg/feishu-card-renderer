import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

export function requireSingleMatch(files, pattern, label, directory) {
  const matches = files.filter((file) => pattern.test(file));
  if (matches.length !== 1) {
    throw new Error(
      `${directory}: expected exactly one ${label}, found ${matches.length}`
      + (matches.length > 0 ? ` (${matches.sort().join(", ")})` : ""),
    );
  }
  return matches[0];
}

export async function measureBundleDirectory(directory) {
  const absolute = resolve(directory);
  const files = await readdir(absolute);
  const shared = requireSingleMatch(
    files,
    /^index-.*\.js$/u,
    "hashed shared index chunk",
    directory,
  );
  const vchart = requireSingleMatch(
    files,
    /^vchart-runtime-.*\.js$/u,
    "VChart runtime chunk",
    directory,
  );
  const artifacts = {
    eager: "index.js",
    shared,
    css: "styles.css",
    vchart,
  };
  const result = {};
  for (const [name, file] of Object.entries(artifacts)) {
    const bytes = await readFile(resolve(absolute, file));
    result[name] = {
      file,
      raw: bytes.byteLength,
      gzip: gzipSync(bytes, { level: 9 }).byteLength,
    };
  }
  return result;
}

export async function measureBundleComparison(
  baselineArgument,
  candidateArgument = "dist",
) {
  const baseline = await measureBundleDirectory(baselineArgument);
  const candidate = await measureBundleDirectory(candidateArgument);
  const delta = Object.fromEntries(Object.keys(baseline).map((name) => [
    name,
    {
      raw: candidate[name].raw - baseline[name].raw,
      gzip: candidate[name].gzip - baseline[name].gzip,
    },
  ]));
  return {
    method: "Node zlib.gzipSync level=9; exact bytes; exact-one chunk matching",
    baseline: { directory: resolve(baselineArgument), artifacts: baseline },
    candidate: { directory: resolve(candidateArgument), artifacts: candidate },
    delta,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [baselineArgument, candidateArgument = "dist"] = process.argv.slice(2);
  if (!baselineArgument) {
    throw new Error(
      "usage: node scripts/measure-bundle-dirs.mjs <baseline-dist> [candidate-dist]",
    );
  }
  console.log(JSON.stringify(
    await measureBundleComparison(baselineArgument, candidateArgument),
    null,
    2,
  ));
}
