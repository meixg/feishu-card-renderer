import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const staticImportPattern = /(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["'](\.[^"']+)["']/gu;

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

export async function collectStaticJavaScriptFiles(directory, entry = "index.js") {
  const absolute = resolve(directory);
  const collected = new Set();

  async function visit(file) {
    const normalizedFile = normalize(file);
    if (collected.has(normalizedFile)) return;
    if (relative(absolute, resolve(absolute, normalizedFile)).startsWith("..")) {
      throw new Error(`${directory}: static import escapes the bundle directory (${file})`);
    }
    const source = await readFile(resolve(absolute, normalizedFile), "utf8");
    collected.add(normalizedFile);
    for (const match of source.matchAll(staticImportPattern)) {
      await visit(join(dirname(normalizedFile), match[1]));
    }
  }

  await visit(entry);
  return [...collected].sort();
}

async function measureFiles(absolute, files) {
  const buffers = await Promise.all(files.map((file) => readFile(resolve(absolute, file))));
  return {
    files,
    raw: buffers.reduce((total, bytes) => total + bytes.byteLength, 0),
    gzip: buffers.reduce(
      (total, bytes) => total + gzipSync(bytes, { level: 9 }).byteLength,
      0,
    ),
  };
}

export async function measureBundleDirectory(directory) {
  const absolute = resolve(directory);
  const files = await readdir(absolute);
  const vchart = requireSingleMatch(
    files,
    /^vchart-runtime-.*\.js$/u,
    "VChart runtime chunk",
    directory,
  );
  const artifacts = {
    eager: await collectStaticJavaScriptFiles(directory),
    css: ["styles.css"],
    vchart: [vchart],
  };
  const result = {};
  for (const [name, artifactFiles] of Object.entries(artifacts)) {
    result[name] = await measureFiles(absolute, artifactFiles);
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
