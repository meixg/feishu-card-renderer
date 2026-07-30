import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const evidenceRoot = resolve(root, "test-results/visual-determinism");
const targets = [
  "button-base-nova-themes.png",
  "card-form-controls-error-compact.png",
];
const records = [];

await mkdir(evidenceRoot, { recursive: true });

for (let run = 1; run <= 3; run += 1) {
  const outputDirectory = resolve(evidenceRoot, `run-${run}`);
  const result = spawnSync("pnpm", ["exec", "playwright", "test"], {
    cwd: root,
    env: {
      ...process.env,
      FCR_VISUAL_HASH_EVIDENCE_DIR: outputDirectory,
    },
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`Strict visual run ${run} failed with exit code ${result.status}`);
  }
  for (const target of targets) {
    const bytes = await readFile(resolve(outputDirectory, target));
    records.push({
      run,
      file: target,
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
}

for (const target of targets) {
  const hashes = records
    .filter((record) => record.file === target)
    .map((record) => record.sha256);
  if (new Set(hashes).size !== 1) {
    throw new Error(`${target} changed across strict runs: ${hashes.join(", ")}`);
  }
}

const report = `${JSON.stringify(records, null, 2)}\n`;
await writeFile(resolve(evidenceRoot, "hashes.json"), report);
console.log(report);
