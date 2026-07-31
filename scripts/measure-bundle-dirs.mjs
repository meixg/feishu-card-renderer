import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const [baselineArgument, candidateArgument = "dist"] = process.argv.slice(2);
if (!baselineArgument) {
  throw new Error(
    "usage: node scripts/measure-bundle-dirs.mjs <baseline-dist> [candidate-dist]",
  );
}

async function measure(directory) {
  const absolute = resolve(directory);
  const files = await readdir(absolute);
  const shared = files.find((file) => /^index-.*\.js$/u.test(file));
  const vchart = files.find((file) => /^vchart-runtime-.*\.js$/u.test(file));
  if (!shared || !vchart) {
    throw new Error(`${directory} does not contain the expected Vite chunks`);
  }
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

const baseline = await measure(baselineArgument);
const candidate = await measure(candidateArgument);
const delta = Object.fromEntries(Object.keys(baseline).map((name) => [
  name,
  {
    raw: candidate[name].raw - baseline[name].raw,
    gzip: candidate[name].gzip - baseline[name].gzip,
  },
]));
console.log(JSON.stringify({
  method: "Node zlib.gzipSync level=9; exact bytes",
  baseline: { directory: resolve(baselineArgument), artifacts: baseline },
  candidate: { directory: resolve(candidateArgument), artifacts: candidate },
  delta,
}, null, 2));
