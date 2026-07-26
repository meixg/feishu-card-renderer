import { access, readFile, readdir } from "node:fs/promises";

const requiredArtifacts = [
  "dist/index.js",
  "dist/index.d.ts",
  "dist/schema.js",
  "dist/schema/index.d.ts",
  "dist/styles.css",
];

await Promise.all(requiredArtifacts.map((artifact) => access(artifact)));

const entry = await readFile("dist/index.js", "utf8");
const schemaEntry = await readFile("dist/schema.js", "utf8");
const files = await readdir("dist");

if (!entry.includes('from "react/jsx-runtime"')) {
  throw new Error("React JSX runtime must remain an external ESM import.");
}

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
if (schemaEntry.includes("react") || schemaEntry.includes("vchart")) {
  throw new Error("The pure schema subpath must not depend on React or VChart.");
}
const schemaModule = await import("@meixg/feishu-card-renderer/schema");
if (typeof schemaModule.validateCard !== "function" ||
  typeof schemaModule.normalizeCard !== "function") {
  throw new Error("The schema subpath must export validation and normalization.");
}

console.log("Build contract verified: ESM, schema subpath, declarations, scoped CSS, React external, lazy VChart chunk.");
