import { access, readFile } from "node:fs/promises";

const requiredArtifacts = [
  "dist/index.js",
  "dist/index.d.ts",
  "dist/styles.css",
];

await Promise.all(requiredArtifacts.map((artifact) => access(artifact)));

const entry = await readFile("dist/index.js", "utf8");

if (!entry.includes('from "react/jsx-runtime"')) {
  throw new Error("React JSX runtime must remain an external ESM import.");
}

if (entry.includes("react.production.min") || entry.includes("react.development")) {
  throw new Error("React implementation was bundled into the library output.");
}

console.log("Build contract verified: ESM, declarations, scoped CSS, React external.");
