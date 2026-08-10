import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import postcss from "postcss";
import ts from "typescript";

import {
  PINNED_SHADCN_COMMIT,
  PINNED_SHADCN_LOCAL_HASHES,
  PINNED_SHADCN_UPSTREAM_HASHES,
} from "./ui-provenance-expected.mjs";
import {
  EXPECTED_LEGACY_CHOICE_SELECTORS,
} from "./legacy-interaction-expected.mjs";

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
  const requiredLucideImports = new Map([
    ["src/components/ui/checkbox.tsx", new Set(["CheckIcon"])],
    ["src/components/ui/dialog.tsx", new Set(["XIcon"])],
    ["src/components/ui/radio-group.tsx", new Set(["CircleIcon"])],
    ["src/components/ui/calendar.tsx", new Set([
      "ChevronDownIcon", "ChevronLeftIcon", "ChevronRightIcon",
    ])],
    ["src/components/ui/choice-field.tsx", new Set([
      "CheckIcon", "ChevronDownIcon", "SearchIcon", "XIcon",
    ])],
    ["src/components/ui/pagination.tsx", new Set([
      "ChevronLeft", "ChevronRight", "MoreHorizontal",
    ])],
    ["src/components/interactive/interactive.tsx", new Set([
      "CalendarIcon", "EllipsisIcon",
    ])],
    ["src/components/primitives/PreviewDialog.tsx",
      new Set(["ChevronLeftIcon", "ChevronRightIcon"])],
  ]);
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
    const foundLucideImports = new Set();
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
          } else {
            for (const element of clause.namedBindings.elements) {
              foundLucideImports.add(element.propertyName?.text ?? element.name.text);
            }
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
    if (
      relative === "src/components/ui/choice-field.tsx"
      && /[✓×]/u.test(source)
    ) {
      violations.push(
        `${relative}: text glyph icons are forbidden; use reviewed Lucide composition`,
      );
    }
    for (const icon of requiredLucideImports.get(relative) ?? []) {
      if (!foundLucideImports.has(icon)) {
        violations.push(`${relative}: reviewed named Lucide import ${icon} is required`);
      }
    }
  }
  return violations.sort();
}

export async function verifyLegacyInteractionInventory({
  manifestRoot = root,
  localRoot = root,
} = {}) {
  const violations = [];
  const inventory = JSON.parse(await readFile(resolve(
    manifestRoot,
    "docs/specs/legacy-interaction-inventory.json",
  ), "utf8"));
  const normalizeSelector = (selector) => selector
    .replace(/\s+/gu, " ")
    .replace(/\s*([>+~])\s*/gu, "$1")
    .trim();
  const selectorSet = (rootNode) => {
    const selectors = new Set();
    rootNode.walkRules((rule) => {
      for (const selector of rule.selectors) {
        selectors.add(normalizeSelector(selector));
      }
    });
    return selectors;
  };
  const sorted = (values) => [...values].sort();
  const manifestMoved = new Set(
    inventory.movedToPinnedOwnerSelectors.map(normalizeSelector),
  );
  const manifestRemoved = new Set(
    inventory.removedLegacySelectors.map(normalizeSelector),
  );
  const expectedMoved = new Set(EXPECTED_LEGACY_CHOICE_SELECTORS.moved);
  const expectedRemoved = new Set(EXPECTED_LEGACY_CHOICE_SELECTORS.removed);
  if (
    JSON.stringify(sorted(manifestMoved))
    !== JSON.stringify(sorted(expectedMoved))
  ) {
    violations.push(
      "legacy inventory moved selector classification drifted from immutable registry",
    );
  }
  if (
    JSON.stringify(sorted(manifestRemoved))
    !== JSON.stringify(sorted(expectedRemoved))
  ) {
    violations.push(
      "legacy inventory removed selector classification drifted from immutable registry",
    );
  }
  const manifestUniverse = new Set([...manifestMoved, ...manifestRemoved]);
  const expectedUniverse = new Set([...expectedMoved, ...expectedRemoved]);
  if (
    manifestUniverse.size !== inventory.movedToPinnedOwnerSelectors.length
      + inventory.removedLegacySelectors.length
    || JSON.stringify(sorted(manifestUniverse))
      !== JSON.stringify(sorted(expectedUniverse))
  ) {
    violations.push(
      "legacy inventory selector universe must exactly match immutable registry",
    );
  }
  const entryCss = await readFile(resolve(localRoot, "src/styles.css"), "utf8");
  const cssRoot = postcss.parse(entryCss, { from: "src/styles.css" });
  const imports = [];
  cssRoot.walkAtRules("import", (rule) => {
    const match = rule.params.match(/^["'](.+)["']$/u);
    if (match) imports.push(`src/${match[1].replace(/^\.\//u, "")}`);
  });
  if (JSON.stringify(imports) !== JSON.stringify(inventory.visualOwners)) {
    violations.push("legacy inventory visualOwners must exactly match stylesheet imports");
  }

  const sharedSelectors = selectorSet(cssRoot);
  for (const forbidden of expectedRemoved) {
    if (sharedSelectors.has(forbidden)) {
      violations.push(`${forbidden}: removed legacy selector returned to shared styles`);
    }
  }

  const ownerSelectors = new Set();
  for (const owner of inventory.visualOwners) {
    const ownerRoot = postcss.parse(
      await readFile(resolve(localRoot, owner), "utf8"),
      { from: owner },
    );
    for (const selector of selectorSet(ownerRoot)) ownerSelectors.add(selector);
  }
  for (const moved of expectedMoved) {
    if (sharedSelectors.has(moved)) {
      violations.push(`${moved}: visual selector must not return to shared styles`);
    }
    if (!ownerSelectors.has(moved)) {
      violations.push(`${moved}: reviewed pinned visual owner is missing`);
    }
  }
  for (const removed of expectedRemoved) {
    if (ownerSelectors.has(removed)) {
      violations.push(`${removed}: removed legacy selector returned to a visual owner`);
    }
  }
  return violations.sort();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function verifyUiProvenance({
  manifestRoot = root,
  localRoot = root,
} = {}) {
  const violations = [];
  const expected = {
    commit: PINNED_SHADCN_COMMIT,
    cli: "4.16.0",
    style: "base-nova",
    base: "base",
    baseColor: "neutral",
    iconLibrary: "lucide",
    rsc: false,
    baseUi: "1.6.0",
    lucide: "0.536.0",
  };
  const manifests = [
    ["button", "docs/specs/shadcn-base-nova-baseline.json", [
      "apps/v4/registry/bases/base/ui/button.tsx",
      "apps/v4/registry/styles/style-nova.css",
      "apps/v4/registry/themes.ts",
    ], "2026-07-30"],
    ["form controls", "docs/specs/shadcn-base-nova-form-controls-baseline.json", [
      "apps/v4/registry/bases/base/ui/input.tsx",
      "apps/v4/registry/bases/base/ui/textarea.tsx",
      "apps/v4/registry/bases/base/ui/field.tsx",
      "apps/v4/registry/bases/base/ui/label.tsx",
      "apps/v4/registry/bases/base/ui/checkbox.tsx",
      "apps/v4/registry/bases/base/ui/radio-group.tsx",
      "apps/v4/registry/styles/style-nova.css",
      "apps/v4/registry/themes.ts",
    ], "2026-07-30"],
    ["PC choice fields", "docs/specs/shadcn-base-nova-choice-baseline.json", [
      "apps/v4/registry/bases/base/ui/select.tsx",
      "apps/v4/registry/bases/base/ui/combobox.tsx",
      "apps/v4/registry/styles/style-nova.css",
      "apps/v4/registry/themes.ts",
    ], "2026-07-30"],
    ["mobile choice Drawer", "docs/specs/shadcn-base-nova-mobile-drawer-baseline.json", [
      "apps/v4/registry/bases/base/ui/drawer.tsx",
      "apps/v4/registry/bases/base/ui/button.tsx",
      "apps/v4/registry/styles/style-nova.css",
      "apps/v4/registry/themes.ts",
    ], "2026-07-30"],
    ["overlays", "docs/specs/shadcn-base-nova-overlays-baseline.json", [
      "apps/v4/registry/bases/base/ui/dropdown-menu.tsx",
      "apps/v4/registry/bases/base/ui/alert-dialog.tsx",
      "apps/v4/registry/styles/style-nova.css",
      "apps/v4/registry/themes.ts",
    ], "2026-07-30"],
    ["media dialog", "docs/specs/shadcn-base-nova-media-dialog-baseline.json", [
      "apps/v4/registry/bases/base/ui/dialog.tsx",
      "apps/v4/registry/styles/style-nova.css",
      "apps/v4/registry/themes.ts",
    ], "2026-07-31"],
    ["containers", "docs/specs/shadcn-base-nova-containers-baseline.json", [
      "apps/v4/registry/bases/base/ui/collapsible.tsx",
      "apps/v4/registry/bases/base/ui/button.tsx",
      "apps/v4/registry/styles/style-nova.css",
      "apps/v4/registry/themes.ts",
    ], "2026-08-05"],
    ["calendar", "docs/specs/shadcn-base-nova-calendar-baseline.json", [
      "apps/v4/registry/bases/base/ui/popover.tsx",
      "apps/v4/registry/bases/base/ui/calendar.tsx",
    ], "2026-07-31"],
    ["table pagination",
      "docs/specs/shadcn-base-nova-table-pagination-baseline.json", [
        "apps/v4/registry/bases/base/ui/pagination.tsx",
        "apps/v4/registry/bases/base/ui/button.tsx",
        "apps/v4/registry/styles/style-nova.css",
        "apps/v4/registry/themes.ts",
       ], "2026-07-31"],
  ];
  const allReviewedLocalFiles = new Set();
  for (const [owner, path, expectedPaths, reviewedAt] of manifests) {
    const provenance = JSON.parse(
      await readFile(resolve(manifestRoot, path), "utf8"),
    );
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
    if (JSON.stringify(actual) !== JSON.stringify({ reviewedAt, ...expected })) {
      violations.push(`${owner} base-nova reviewed versions or preset drifted`);
    }
    const upstreamFiles = provenance.upstream?.files ?? {};
    if (
      JSON.stringify(Object.keys(upstreamFiles).sort())
      !== JSON.stringify([...expectedPaths].sort())
    ) {
      violations.push(`${owner} reviewed upstream blob hashes are incomplete`);
    }
    for (const [file, actualHash] of Object.entries(upstreamFiles)) {
      const expectedHash = PINNED_SHADCN_UPSTREAM_HASHES[file];
      if (!expectedHash) {
        violations.push(`${owner}: unreviewed upstream path ${file}`);
      } else if (actualHash !== expectedHash) {
        violations.push(`${owner}: ${file} upstream blob hash drifted`);
      }
    }
    const localFiles = provenance.localFiles ?? {};
    for (const file of Object.keys(localFiles)) {
      allReviewedLocalFiles.add(file);
      if (file === "src/styles.css") {
        violations.push(`${owner}: shared styles.css must not be provenance-hashed`);
      }
    }
    const reviewedLocalFiles = PINNED_SHADCN_LOCAL_HASHES[owner] ?? {};
    if (
      JSON.stringify(Object.keys(localFiles).sort())
      !== JSON.stringify(Object.keys(reviewedLocalFiles).sort())
    ) {
      violations.push(`${owner} reviewed local adaptation paths drifted`);
    }
    for (const [file, reviewedHash] of Object.entries(reviewedLocalFiles)) {
      if (localFiles[file] !== reviewedHash) {
        violations.push(`${owner}: ${file} reviewed local hash drifted`);
      }
      try {
        const actualHash = sha256(await readFile(resolve(localRoot, file)));
        if (actualHash !== reviewedHash) {
          violations.push(`${file}: local adaptation hash drifted`);
        }
      } catch {
        violations.push(`${file}: reviewed local adaptation is missing`);
      }
    }
  }
  const uiFiles = (await sourceFiles(resolve(localRoot, "src/components/ui")))
    .map((file) => file.slice(resolve(localRoot).length + 1))
    .sort();
  const reviewedUiFiles = [...allReviewedLocalFiles]
    .filter((file) => file.startsWith("src/components/ui/"))
    .sort();
  if (JSON.stringify(uiFiles) !== JSON.stringify(reviewedUiFiles)) {
    violations.push("pinned provenance must cover every and only internal UI source file");
  }
  return violations.sort();
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const violations = [
    ...await verifyUiArchitecture(),
    ...await verifyUiProvenance(),
    ...await verifyLegacyInteractionInventory(),
  ];
  if (violations.length > 0) {
    throw new Error(`UI architecture verification failed:\n${violations.join("\n")}`);
  }
  console.log("UI architecture and all base-nova provenance manifests verified.");
}
