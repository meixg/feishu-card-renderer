import { execFile } from "node:child_process";
import {
  access,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const runFile = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "..");
const temporaryRoot = await mkdtemp(join(tmpdir(), "feishu-card-renderer-consumer-"));
const packDirectory = join(temporaryRoot, "pack");
const consumerDirectory = join(temporaryRoot, "consumer");

const requiredFiles = new Set([
  "package/package.json",
  "package/README.md",
  "package/LICENSE",
  "package/CHANGELOG.md",
  "package/docs/integration.md",
  "package/docs/compatibility-matrix.md",
]);
const forbiddenPathSegments = [
  "/src/",
  "/tests/",
  "/site/",
  "/scripts/",
  "/docs/specs/",
  "/docs/research/",
  "/docs/agents/",
  "/.github/",
  "/.agents/",
  "/.codex/",
];
const expectedManifest = {
  name: "feishu-card-renderer",
  version: "0.0.1",
  license: "MIT",
  author: "Xuguang Mei",
  homepage: "https://meixg.github.io/feishu-card-renderer/",
  packageManager: "pnpm@10.34.5",
};

try {
  await Promise.all([
    import("node:fs/promises").then(({ mkdir }) =>
      Promise.all([
        mkdir(packDirectory, { recursive: true }),
        mkdir(consumerDirectory, { recursive: true }),
      ])),
    access(join(repositoryRoot, "dist", "index.js")),
  ]);

  const { stdout: packOutput } = await runFile(
    "npm",
    ["pack", "--json", "--pack-destination", packDirectory],
    { cwd: repositoryRoot, maxBuffer: 10 * 1024 * 1024 },
  );
  const [packResult] = JSON.parse(packOutput);
  if (!packResult?.filename || !Array.isArray(packResult.files)) {
    throw new Error("npm pack did not return a usable package manifest.");
  }

  const packedFiles = new Set(packResult.files.map(({ path }) => `package/${path}`));
  for (const requiredFile of requiredFiles) {
    if (!packedFiles.has(requiredFile)) {
      throw new Error(`Required consumer file is missing from tarball: ${requiredFile}`);
    }
  }
  for (const file of packedFiles) {
    if (
      !requiredFiles.has(file)
      && !file.startsWith("package/dist/")
    ) {
      throw new Error(`Unexpected file crossed the package boundary: ${file}`);
    }
    if (forbiddenPathSegments.some((segment) => file.includes(segment))) {
      throw new Error(`Internal content crossed the package boundary: ${file}`);
    }
  }

  const tarball = join(packDirectory, packResult.filename);
  const sourceManifest = JSON.parse(await readFile(
    join(repositoryRoot, "package.json"),
    "utf8",
  ));
  for (const [field, expected] of Object.entries(expectedManifest)) {
    if (sourceManifest[field] !== expected) {
      throw new Error(`package.json ${field} must be ${JSON.stringify(expected)}.`);
    }
  }
  if (
    sourceManifest.repository?.url
      !== "git+https://github.com/meixg/feishu-card-renderer.git"
    || sourceManifest.bugs?.url
      !== "https://github.com/meixg/feishu-card-renderer/issues"
    || sourceManifest.publishConfig?.access !== "public"
    || sourceManifest.engines?.node !== ">=22.12.0"
  ) {
    throw new Error("Package publication metadata is incomplete or inconsistent.");
  }
  await writeFile(
    join(consumerDirectory, "package.json"),
    JSON.stringify({
      name: "feishu-card-renderer-consumer-smoke",
      private: true,
      type: "module",
    }, null, 2),
  );
  await runFile(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      tarball,
      "react@19.1.1",
      "react-dom@19.1.1",
      "typescript@5.8.3",
      "@types/react@19.1.9",
      "@types/react-dom@19.1.7",
    ],
    { cwd: consumerDirectory, maxBuffer: 20 * 1024 * 1024 },
  );
  await runFile("npm", ["ls", "--all"], {
    cwd: consumerDirectory,
    maxBuffer: 20 * 1024 * 1024,
  });

  await writeFile(
    join(consumerDirectory, "consumer.tsx"),
    `import { CardRenderer, type CardJsonV2 } from "feishu-card-renderer";
import {
  normalizeCard,
  validateCard,
  type CardDiagnostic,
} from "feishu-card-renderer/schema";

const card = {
  schema: "2.0",
  body: { elements: [] },
} satisfies CardJsonV2;
const diagnostics: readonly CardDiagnostic[] = validateCard(card).diagnostics;
normalizeCard(card);
export const renderer = <CardRenderer card={card} onDiagnostic={() => diagnostics} />;
`,
  );
  await writeFile(
    join(consumerDirectory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        skipLibCheck: true,
      },
      include: ["consumer.tsx"],
    }, null, 2),
  );
  await runFile(join(consumerDirectory, "node_modules", ".bin", "tsc"), ["-p", "."], {
    cwd: consumerDirectory,
  });

  await writeFile(
    join(consumerDirectory, "consumer.mjs"),
    `import { readFile } from "node:fs/promises";
import React from "react";
import { renderToString } from "react-dom/server";
import { CardRenderer } from "feishu-card-renderer";
import { normalizeCard, validateCard } from "feishu-card-renderer/schema";

if (typeof CardRenderer !== "function") throw new Error("root export is unavailable");
if (typeof normalizeCard !== "function" || typeof validateCard !== "function") {
  throw new Error("schema subpath exports are unavailable");
}
const cssUrl = import.meta.resolve("feishu-card-renderer/styles.css");
const css = await readFile(new URL(cssUrl), "utf8");
if (!css.includes(".fcr")) throw new Error("published CSS is unavailable or unscoped");
const html = renderToString(
  React.createElement(CardRenderer, { card: { schema: "2.0" } }),
);
if (!html.includes('data-fcr-card-renderer="ready"')) {
  throw new Error("SSR render did not produce the package contract");
}
`,
  );
  await runFile("node", ["consumer.mjs"], { cwd: consumerDirectory });

  const installedManifest = JSON.parse(await readFile(
    join(consumerDirectory, "node_modules", "feishu-card-renderer", "package.json"),
    "utf8",
  ));
  if (installedManifest.name !== "feishu-card-renderer" || installedManifest.version !== "0.0.1") {
    throw new Error("The installed package identity does not match feishu-card-renderer@0.0.1.");
  }

  console.log(
    `Package contract verified from ${packResult.filename}: exact content boundary, install, `
    + "root/schema/CSS exports, declarations, SSR import/render, peers and dependency closure.",
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
