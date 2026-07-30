import {
  cp,
  mkdtemp,
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

it("pins the Issue #81 base-nova media Dialog adaptation", async () => {
  const provenance = JSON.parse(await readFile(
    resolve(root, "docs/specs/shadcn-base-nova-media-dialog-baseline.json"),
    "utf8",
  )) as {
    upstream: { files: Record<string, string> };
    localFiles: Record<string, string>;
  };
  expect(Object.keys(provenance.upstream.files)).toContain(
    "apps/v4/registry/bases/base/ui/dialog.tsx",
  );
  expect(Object.keys(provenance.localFiles)).toEqual(expect.arrayContaining([
    "src/components/ui/dialog.tsx",
    "src/components/primitives/PreviewDialog.tsx",
    "src/styles/media-dialog-nova.css",
  ]));
});
