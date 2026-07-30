import { createHash } from "node:crypto";
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { expect, it } from "vitest";

import {
  verifyUiArchitecture,
  verifyUiProvenance,
} from "../../scripts/verify-ui-architecture.mjs";

const root = resolve(import.meta.dirname, "../..");

it("keeps Base UI behind the internal UI module and Lucide imports tree-shakable", async () => {
  await expect(verifyUiArchitecture()).resolves.toEqual([]);
});

it("pins the reviewed base-nova inputs and local adaptations without vendoring snapshots", async () => {
  await expect(verifyUiProvenance()).resolves.toEqual([]);
});

it("rejects a valid-format mutation of a pinned upstream hash", async () => {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "fcr-ui-provenance-"));
  try {
    await cp(
      resolve(root, "docs"),
      resolve(temporaryRoot, "docs"),
      { recursive: true },
    );
    const manifestPath = resolve(
      temporaryRoot,
      "docs/specs/shadcn-base-nova-overlays-baseline.json",
    );
    const provenance = JSON.parse(await readFile(manifestPath, "utf8")) as {
      upstream: { files: Record<string, string> };
    };
    const dropdownPath =
      "apps/v4/registry/bases/base/ui/dropdown-menu.tsx";
    provenance.upstream.files[dropdownPath] = "a".repeat(64);
    await writeFile(manifestPath, `${JSON.stringify(provenance, null, 2)}\n`);

    await expect(verifyUiProvenance({
      manifestRoot: temporaryRoot,
      localRoot: root,
    })).resolves.toContain(
      `overlays: ${dropdownPath} upstream blob hash drifted`,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

type LocalManifest = { localFiles: Record<string, string> };

async function withMutableProvenance(
  mutate: (context: {
    manifest: LocalManifest;
    manifestPath: string;
    sourceRoot: string;
  }) => Promise<void> | void,
) {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "fcr-ui-local-provenance-"));
  await cp(resolve(root, "docs"), resolve(temporaryRoot, "docs"), {
    recursive: true,
  });
  await cp(resolve(root, "src"), resolve(temporaryRoot, "src"), {
    recursive: true,
  });
  const manifestPath = resolve(
    temporaryRoot,
    "docs/specs/shadcn-base-nova-mobile-drawer-baseline.json",
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as LocalManifest;
  try {
    await mutate({ manifest, manifestPath, sourceRoot: temporaryRoot });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return await verifyUiProvenance({
      manifestRoot: temporaryRoot,
      localRoot: temporaryRoot,
    });
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

it("rejects deleting one or every local provenance key", async () => {
  const deleted = await withMutableProvenance(({ manifest }) => {
    delete manifest.localFiles["src/components/ui/drawer.tsx"];
  });
  expect(deleted).toContain("mobile choice Drawer: reviewed local path set drifted");

  const emptied = await withMutableProvenance(({ manifest }) => {
    manifest.localFiles = {};
  });
  expect(emptied).toContain("mobile choice Drawer: reviewed local path set drifted");
});

it("rejects substituting an unrelated real file and its actual hash", async () => {
  const violations = await withMutableProvenance(async ({ manifest, sourceRoot }) => {
    const readme = await readFile(resolve(root, "README.md"));
    manifest.localFiles = {
      "README.md": createHash("sha256").update(readme).digest("hex"),
    };
    await writeFile(resolve(sourceRoot, "README.md"), readme);
  });
  expect(violations).toContain("mobile choice Drawer: reviewed local path set drifted");
});

it("rejects a valid-format but unreviewed local hash", async () => {
  const violations = await withMutableProvenance(({ manifest }) => {
    manifest.localFiles["src/components/ui/drawer.tsx"] = "a".repeat(64);
  });
  expect(violations).toContain(
    "mobile choice Drawer: src/components/ui/drawer.tsx manifest local hash drifted",
  );
});

it("rejects changing both a local source and its manifest hash", async () => {
  const violations = await withMutableProvenance(async ({
    manifest,
    sourceRoot,
  }) => {
    const path = "src/components/ui/drawer.tsx";
    const mutated = `${await readFile(resolve(sourceRoot, path), "utf8")}\n`;
    await mkdir(resolve(sourceRoot, "src/components/ui"), { recursive: true });
    await writeFile(resolve(sourceRoot, path), mutated);
    manifest.localFiles[path] = createHash("sha256").update(mutated).digest("hex");
  });
  expect(violations).toEqual(expect.arrayContaining([
    "mobile choice Drawer: src/components/ui/drawer.tsx manifest local hash drifted",
    "src/components/ui/drawer.tsx: local adaptation hash drifted",
  ]));
});

it("pins the Issue #76 base-nova form-control adaptations", async () => {
  const provenance = JSON.parse(await readFile(
    resolve(root, "docs/specs/shadcn-base-nova-form-controls-baseline.json"),
    "utf8",
  )) as {
    upstream: { files: Record<string, string> };
    localFiles: Record<string, string>;
  };
  expect(Object.keys(provenance.upstream.files)).toEqual(expect.arrayContaining([
    "apps/v4/registry/bases/base/ui/input.tsx",
    "apps/v4/registry/bases/base/ui/textarea.tsx",
    "apps/v4/registry/bases/base/ui/checkbox.tsx",
  ]));
  expect(Object.keys(provenance.localFiles)).toEqual(expect.arrayContaining([
    "src/components/ui/input.tsx",
    "src/components/ui/textarea.tsx",
    "src/components/ui/field.tsx",
    "src/components/ui/label.tsx",
    "src/components/ui/checkbox.tsx",
    "src/components/ui/radio-group.tsx",
    "src/styles/form-controls-nova.css",
  ]));
});

it("pins official Select and Combobox wrappers including multiple chips", async () => {
  const provenance = JSON.parse(await readFile(
    resolve(root, "docs/specs/shadcn-base-nova-choice-baseline.json"),
    "utf8",
  )) as { localFiles: Record<string, string> };
  expect(Object.keys(provenance.localFiles)).toEqual(expect.arrayContaining([
    "src/components/ui/select.tsx",
    "src/components/ui/combobox.tsx",
    "src/styles/choice-nova.css",
  ]));

  const choiceSource = await readFile(
    resolve(root, "src/components/ui/choice-field.tsx"),
    "utf8",
  );
  expect(choiceSource).toMatch(/<ComboboxChips/u);
  expect(choiceSource).toMatch(/<ComboboxValue/u);
  expect(choiceSource).toMatch(/<ComboboxChip/u);
  expect(choiceSource).toMatch(/<ComboboxChipsInput/u);
});

it("pins the Issue #79 Dropdown Menu and Alert Dialog adaptations", async () => {
  const provenance = JSON.parse(await readFile(
    resolve(root, "docs/specs/shadcn-base-nova-overlays-baseline.json"),
    "utf8",
  )) as {
    upstream: { files: Record<string, string> };
    localFiles: Record<string, string>;
  };
  expect(Object.keys(provenance.upstream.files)).toEqual(expect.arrayContaining([
    "apps/v4/registry/bases/base/ui/dropdown-menu.tsx",
    "apps/v4/registry/bases/base/ui/alert-dialog.tsx",
  ]));
  expect(Object.keys(provenance.localFiles)).toEqual(expect.arrayContaining([
    "src/components/ui/dropdown-menu.tsx",
    "src/components/ui/alert-dialog.tsx",
    "src/components/primitives/ConfirmDialog.tsx",
    "src/styles/overlays-nova.css",
  ]));
});

it("pins the Issue #82 Collapsible adaptation in the trusted registry", async () => {
  const provenance = JSON.parse(await readFile(
    resolve(root, "docs/specs/shadcn-base-nova-containers-baseline.json"),
    "utf8",
  )) as {
    upstream: { files: Record<string, string> };
    localFiles: Record<string, string>;
  };
  expect(Object.keys(provenance.upstream.files)).toContain(
    "apps/v4/registry/bases/base/ui/collapsible.tsx",
  );
  expect(Object.keys(provenance.localFiles)).toEqual(expect.arrayContaining([
    "src/components/ui/collapsible.tsx",
    "src/components/containers/containers.tsx",
    "src/styles/containers-nova.css",
  ]));
});

it("rejects a self-approved Issue #82 Collapsible upstream mutation", async () => {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "fcr-ui-containers-"));
  try {
    await cp(
      resolve(root, "docs"),
      resolve(temporaryRoot, "docs"),
      { recursive: true },
    );
    const manifestPath = resolve(
      temporaryRoot,
      "docs/specs/shadcn-base-nova-containers-baseline.json",
    );
    const provenance = JSON.parse(await readFile(manifestPath, "utf8")) as {
      upstream: { files: Record<string, string> };
    };
    const collapsiblePath =
      "apps/v4/registry/bases/base/ui/collapsible.tsx";
    provenance.upstream.files[collapsiblePath] = "b".repeat(64);
    await writeFile(manifestPath, `${JSON.stringify(provenance, null, 2)}\n`);

    await expect(verifyUiProvenance({
      manifestRoot: temporaryRoot,
      localRoot: root,
    })).resolves.toContain(
      `containers: ${collapsiblePath} upstream blob hash drifted`,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
