import { access, readFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { basename, dirname, join } from "node:path";
import { promisify } from "node:util";

const requiredArtifacts = [
  "dist/index.js",
  "dist/index.d.ts",
  "dist/schema.js",
  "dist/schema/index.d.ts",
  "dist/styles.css",
];

await Promise.all(requiredArtifacts.map((artifact) => access(artifact)));
const runFile = promisify(execFile);

const entry = await readFile("dist/index.js", "utf8");
const entryTypes = await readFile("dist/index.d.ts", "utf8");
const files = await readdir("dist");

if (!entry.includes('from "react/jsx-runtime"')) {
  throw new Error("React JSX runtime must remain an external ESM import.");
}
if (!entryTypes.includes("CardJsonV2")) {
  throw new Error("The package root must export the CardJsonV2 type.");
}
await runFile("node_modules/.bin/tsc", [
  "--noEmit",
  "--strict",
  "--skipLibCheck",
  "--module", "ESNext",
  "--moduleResolution", "Bundler",
  "--target", "ES2022",
  "scripts/package-root-contract.ts",
]);

if (entry.includes("react.production.min") || entry.includes("react.development")) {
  throw new Error("React implementation was bundled into the library output.");
}

const vchartChunks = files.filter((file) => /^vchart-runtime-.*\.js$/.test(file));
if (vchartChunks.length !== 1) {
  throw new Error("VChart must be emitted as one independent lazy runtime chunk.");
}
if (!entry.includes(`./${vchartChunks[0]}`)) {
  throw new Error("The package entry must reference VChart through a dynamic import.");
}
if (entry.includes("class VChart") || entry.includes("registerBarChart")) {
  throw new Error("VChart implementation leaked into the eagerly loaded package entry.");
}
const staticImportPattern = /(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["'](\.[^"']+)["']/g;
const schemaClosure = new Map();
async function collectStaticClosure(file) {
  if (schemaClosure.has(file)) return;
  const source = await readFile(file, "utf8");
  schemaClosure.set(file, source);
  for (const match of source.matchAll(staticImportPattern)) {
    const dependency = join(dirname(file), match[1]);
    if (basename(dependency).startsWith("vchart-runtime-")) {
      throw new Error("The pure schema dependency closure references VChart.");
    }
    await collectStaticClosure(dependency);
  }
}
await collectStaticClosure("dist/schema.js");
for (const [file, source] of schemaClosure) {
  if (/(?:from\s*["']react(?:\/|["'])|vchart)/i.test(source)) {
    throw new Error(
      `The pure schema dependency closure contains React/VChart in ${file}.`,
    );
  }
}
const schemaModule = await import("@meixg/feishu-card-renderer/schema");
if (typeof schemaModule.validateCard !== "function" ||
  typeof schemaModule.normalizeCard !== "function") {
  throw new Error("The schema subpath must export validation and normalization.");
}

console.log("Build contract verified: ESM, schema subpath, declarations, scoped CSS, React external, lazy VChart chunk.");
