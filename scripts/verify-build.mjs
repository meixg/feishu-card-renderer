import { access, readFile, readdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { basename, dirname, join } from "node:path";
import { promisify } from "node:util";
import postcss from "postcss";

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
const packageManifest = JSON.parse(await readFile("package.json", "utf8"));
const css = await readFile("dist/styles.css", "utf8");
const files = await readdir("dist");
const cssFiles = files.filter((file) => file.endsWith(".css"));

if (cssFiles.length !== 1 || cssFiles[0] !== "styles.css") {
  throw new Error("The build must emit exactly one published CSS artifact: dist/styles.css.");
}
if (css.includes("--tw-")) {
  throw new Error("Tailwind internal variables leaked into the published CSS artifact.");
}

const stylesheet = postcss.parse(css);
const forbiddenRawThemeTokens = new Set([
  "--background",
  "--foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--border",
  "--input",
  "--ring",
  "--radius",
  "--popover",
  "--popover-foreground",
]);
stylesheet.walkDecls((declaration) => {
  if (forbiddenRawThemeTokens.has(declaration.prop)) {
    throw new Error(`Raw shadcn token leaked into dist/styles.css: ${declaration.prop}`);
  }
  for (const token of forbiddenRawThemeTokens) {
    if (declaration.value.includes(`var(${token})`)) {
      throw new Error(`Unresolved shadcn token leaked into dist/styles.css: ${token}`);
    }
  }
});
for (const rule of stylesheet.nodes.flatMap(function walk(node) {
  if (node.type === "rule") return [node];
  if ("nodes" in node && Array.isArray(node.nodes)) {
    return node.nodes.flatMap(walk);
  }
  return [];
})) {
  let inKeyframes = false;
  for (let parent = rule.parent; parent; parent = parent.parent) {
    if (parent.type === "atrule" && /keyframes$/i.test(parent.name)) {
      inKeyframes = true;
      break;
    }
  }
  if (inKeyframes) continue;
  if (!rule.selectors.every((selector) => selector.includes(".fcr"))) {
    throw new Error(`Unscoped selector leaked into dist/styles.css: ${rule.selector}`);
  }
  if (rule.selectors.some((selector) =>
    /^(?::root|html(?:\W|$)|body(?:\W|$)|\*(?:\W|$)|\.dark(?:\W|$))/u
      .test(selector.trim())
  )) {
    throw new Error(`Global theme/reset selector leaked into dist/styles.css: ${rule.selector}`);
  }
}

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
if (packageManifest.peerDependencies?.react !== ">=18.2.0 <20" ||
  packageManifest.peerDependencies?.["react-dom"] !== ">=18.2.0 <20" ||
  packageManifest.dependencies?.react ||
  packageManifest.dependencies?.["react-dom"]) {
  throw new Error("React and ReactDOM must remain external peer dependencies.");
}
const expectedRuntimeDependencies = {
  "@base-ui/react": "^1.6.0",
  "class-variance-authority": "^0.7.1",
  clsx: "^2.1.1",
  "react-day-picker": "^9.7.0",
  "tailwind-merge": "^3.6.0",
};
for (const [dependency, range] of Object.entries(expectedRuntimeDependencies)) {
  if (packageManifest.dependencies?.[dependency] !== range) {
    throw new Error(`${dependency} must remain a verified runtime dependency (${range}).`);
  }
  if (!entry.includes(`from "${dependency}`)) {
    throw new Error(`${dependency} must remain external in the renderer entry.`);
  }
}
if (packageManifest.dependencies?.["lucide-react"] !== "^0.536.0") {
  throw new Error("lucide-react must remain the reviewed named-icon dependency (^0.536.0).");
}
if (entry.includes('from "lucide-react"') || entry.includes("lucide-react/dist")) {
  throw new Error("Lucide must be tree-shaken into the renderer, not left as a broad runtime import.");
}
if (packageManifest.dependencies?.tailwindcss ||
  packageManifest.dependencies?.["@tailwindcss/postcss"] ||
  !packageManifest.devDependencies?.tailwindcss ||
  !packageManifest.devDependencies?.["@tailwindcss/postcss"]) {
  throw new Error("Tailwind must remain build-only; consumers receive precompiled CSS.");
}
if (entry.includes("@base-ui/utils") || entry.includes("BaseUI")) {
  throw new Error("Base UI implementation code was bundled into the renderer entry.");
}
if (!entry.includes('from "react-day-picker"') ||
  !entry.includes('from "react-day-picker/locale"')) {
  throw new Error("The private Calendar must retain external react-day-picker imports.");
}
if (/(?:from|import\()\s*["'](?:@\/|#)/.test(entry)) {
  throw new Error("A source alias leaked into the built renderer entry.");
}
if (/components\/ui|ButtonProps|buttonVariants/.test(entryTypes)) {
  throw new Error("Private shadcn/Base UI wrappers leaked from the public types.");
}
if (!entry.includes("micromark") || !entry.includes("mdast")) {
  throw new Error(
    "The ESM renderer entry must contain the bundled Markdown parser implementation.",
  );
}
if (/(?:from|import\()\s*["'](?:mdast-util|micromark-extension)/.test(entry)) {
  throw new Error("Markdown parser packages leaked as unresolved ESM imports.");
}

let networkCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = () => {
  networkCalls += 1;
  throw new Error("The package entry performed a network request during import.");
};
try {
  const rootModule = await import("feishu-card-renderer");
  if (typeof rootModule.CardRenderer !== "function") {
    throw new Error("The ESM package root must export CardRenderer.");
  }
} finally {
  globalThis.fetch = originalFetch;
}
if (networkCalls !== 0) {
  throw new Error("The package entry performed network work during import.");
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
const schemaModule = await import("feishu-card-renderer/schema");
if (typeof schemaModule.validateCard !== "function" ||
  typeof schemaModule.normalizeCard !== "function") {
  throw new Error("The schema subpath must export validation and normalization.");
}

const entryBytes = (await stat("dist/index.js")).size;
const sharedBytes = (await stat(
  join("dist", files.find((file) => /^index-.*\.js$/.test(file)) ?? ""),
)).size;
console.log(
  "Build contract verified: ESM, bundled Markdown parser, import-time DOM/network safety, "
  + "schema subpath, declarations, single scoped CSS artifact, React external, lazy VChart chunk.",
);
console.log(
  `Bundle metrics (raw): eager renderer ${entryBytes} B + shared ${sharedBytes} B; `
  + `lazy VChart ${(await stat(join("dist", vchartChunks[0]))).size} B.`,
);
