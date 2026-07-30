import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.[cm]?[jt]sx?$/u.test(entry.name) ? [path] : [];
  }));
  return nested.flat();
}

export async function verifyUiArchitecture() {
  const violations = [];
  for (const file of await sourceFiles(resolve(root, "src"))) {
    const source = await readFile(file, "utf8");
    const ast = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const relative = file.slice(root.length + 1);
    function visit(node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        if (
          specifier.startsWith("@base-ui/react")
          && !relative.startsWith("src/components/ui/")
        ) {
          violations.push(`${relative}: Base UI import outside internal UI module`);
        }
        if (specifier === "lucide-react") {
          const clause = node.importClause;
          if (
            !clause
            || clause.name
            || !clause.namedBindings
            || !ts.isNamedImports(clause.namedBindings)
          ) {
            violations.push(`${relative}: Lucide imports must be named`);
          }
        }
      }
      if (
        ts.isExportDeclaration(node)
        && node.moduleSpecifier
        && ts.isStringLiteral(node.moduleSpecifier)
        && node.moduleSpecifier.text.startsWith("@base-ui/react")
        && !relative.startsWith("src/components/ui/")
      ) {
        violations.push(`${relative}: Base UI re-export outside internal UI module`);
      }
      if (
        ts.isCallExpression(node)
        && node.arguments[0]
        && ts.isStringLiteral(node.arguments[0])
      ) {
        const specifier = node.arguments[0].text;
        const dynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
        const commonJsRequire = ts.isIdentifier(node.expression)
          && node.expression.text === "require";
        if (
          (dynamicImport || commonJsRequire)
          && specifier.startsWith("@base-ui/react")
          && !relative.startsWith("src/components/ui/")
        ) {
          violations.push(`${relative}: Base UI runtime import outside internal UI module`);
        }
        if ((dynamicImport || commonJsRequire) && specifier === "lucide-react") {
          violations.push(`${relative}: dynamic or CommonJS Lucide import is forbidden`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  return violations.sort();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function verifyUiProvenance() {
  const provenancePath = resolve(
    root,
    "docs/specs/shadcn-base-nova-baseline.json",
  );
  const provenance = JSON.parse(await readFile(provenancePath, "utf8"));
  const violations = [];
  const expected = {
    reviewedAt: "2026-07-30",
    commit: "5203f537d152844a920caa66e865bc61c6ff4860",
    cli: "4.16.0",
    style: "base-nova",
    base: "base",
    baseColor: "neutral",
    iconLibrary: "lucide",
    rsc: false,
    baseUi: "1.6.0",
    lucide: "0.536.0",
  };
  const actual = {
    reviewedAt: provenance.reviewedAt,
    commit: provenance.upstream?.commit,
    cli: provenance.upstream?.cli,
    style: provenance.preset?.style,
    base: provenance.preset?.base,
    baseColor: provenance.preset?.baseColor,
    iconLibrary: provenance.preset?.iconLibrary,
    rsc: provenance.preset?.rsc,
    baseUi: provenance.dependencies?.["@base-ui/react"],
    lucide: provenance.dependencies?.["lucide-react"],
  };
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    violations.push("base-nova reviewed versions or preset drifted");
  }
  const upstreamHashes = Object.values(provenance.upstream?.files ?? {});
  if (
    upstreamHashes.length !== 9
    || upstreamHashes.some((hash) => !/^[0-9a-f]{64}$/u.test(String(hash)))
  ) {
    violations.push("reviewed upstream blob hashes are incomplete");
  }
  for (const [file, expected] of Object.entries(provenance.localFiles ?? {})) {
    const actual = sha256(await readFile(resolve(root, file)));
    if (actual !== expected) violations.push(`${file}: local adaptation hash drifted`);
  }
  return violations.sort();
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const violations = [
    ...await verifyUiArchitecture(),
    ...await verifyUiProvenance(),
  ];
  if (violations.length > 0) {
    throw new Error(`UI architecture verification failed:\n${violations.join("\n")}`);
  }
  console.log("UI architecture and base-nova provenance verified.");
}
