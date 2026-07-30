import { createHash } from "node:crypto";
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
import { PINNED_SHADCN_LOCAL_HASHES } from
  "../../scripts/ui-provenance-expected.mjs";

const root = resolve(import.meta.dirname, "../..");
const calendarManifest =
  "docs/specs/shadcn-base-nova-calendar-baseline.json";
const choiceManifest =
  "docs/specs/shadcn-base-nova-choice-baseline.json";
const tablePaginationManifest =
  "docs/specs/shadcn-base-nova-table-pagination-baseline.json";

async function mutateLocalManifest(
  manifest: string,
  prefix: string,
  mutation: (provenance: {
    localFiles: Record<string, string>;
  }, temporaryRoot: string) => Promise<void> | void,
  { copyLocalFiles = false } = {},
) {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), prefix));
  try {
    await cp(resolve(root, "docs"), resolve(temporaryRoot, "docs"), {
      recursive: true,
    });
    if (copyLocalFiles) {
      await cp(resolve(root, "src"), resolve(temporaryRoot, "src"), {
        recursive: true,
      });
    }
    const manifestPath = resolve(temporaryRoot, manifest);
    const provenance = JSON.parse(await readFile(manifestPath, "utf8")) as {
      localFiles: Record<string, string>;
    };
    await mutation(provenance, temporaryRoot);
    await writeFile(manifestPath, `${JSON.stringify(provenance, null, 2)}\n`);
    return await verifyUiProvenance({
      manifestRoot: temporaryRoot,
      localRoot: copyLocalFiles ? temporaryRoot : root,
    });
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

function mutateCalendarManifest(
  mutation: Parameters<typeof mutateLocalManifest>[2],
  options?: Parameters<typeof mutateLocalManifest>[3],
) {
  return mutateLocalManifest(
    calendarManifest,
    "fcr-calendar-local-",
    mutation,
    options,
  );
}

function mutateChoiceManifest(
  mutation: Parameters<typeof mutateLocalManifest>[2],
  options?: Parameters<typeof mutateLocalManifest>[3],
) {
  return mutateLocalManifest(
    choiceManifest,
    "fcr-choice-local-",
    mutation,
    options,
  );
}

it("keeps Base UI behind the internal UI module and Lucide imports tree-shakable", async () => {
  await expect(verifyUiArchitecture()).resolves.toEqual([]);
});

it("pins the reviewed base-nova inputs and local adaptations without vendoring snapshots", async () => {
  await expect(verifyUiProvenance()).resolves.toEqual([]);
});

it("pins every manifest local key set to the reviewed local registry", async () => {
  const manifests = {
    button: "docs/specs/shadcn-base-nova-baseline.json",
    "form controls":
      "docs/specs/shadcn-base-nova-form-controls-baseline.json",
    "PC choice fields":
      "docs/specs/shadcn-base-nova-choice-baseline.json",
    overlays: "docs/specs/shadcn-base-nova-overlays-baseline.json",
    containers: "docs/specs/shadcn-base-nova-containers-baseline.json",
    calendar: calendarManifest,
    "table pagination": tablePaginationManifest,
  };
  for (const [owner, manifest] of Object.entries(manifests)) {
    const provenance = JSON.parse(
      await readFile(resolve(root, manifest), "utf8"),
    ) as { localFiles: Record<string, string> };
    expect(Object.keys(provenance.localFiles).sort()).toEqual(
      Object.keys(PINNED_SHADCN_LOCAL_HASHES[owner] ?? {}).sort(),
    );
  }
});

it("keeps table pagination integration CSS layout-only", async () => {
  const source = await readFile(
    resolve(root, "src/styles/table-pagination-nova.css"),
    "utf8",
  );
  expect(source).not.toMatch(/fcr-ui-pagination-link\s+svg/u);
  expect(source).not.toMatch(/fcr-table-page-status/u);
  expect(source).not.toMatch(
    /\b(?:min-)?(?:width|height)\s*:\s*\d+(?:px|rem)\b/u,
  );
});

it("rejects table pagination key deletion, valid hash drift, and manifest plus file mutation", async () => {
  const file = "src/components/ui/pagination.tsx";
  await expect(mutateLocalManifest(
    tablePaginationManifest,
    "fcr-table-pagination-delete-",
    (provenance) => {
      delete provenance.localFiles[file];
    },
  )).resolves.toEqual(expect.arrayContaining([
    "table pagination reviewed local adaptation paths drifted",
    `table pagination: ${file} reviewed local hash drifted`,
  ]));

  await expect(mutateLocalManifest(
    tablePaginationManifest,
    "fcr-table-pagination-hash-",
    (provenance) => {
      provenance.localFiles[file] = "d".repeat(64);
    },
  )).resolves.toContain(
    `table pagination: ${file} reviewed local hash drifted`,
  );

  await expect(mutateLocalManifest(
    tablePaginationManifest,
    "fcr-table-pagination-both-",
    async (provenance, temporaryRoot) => {
      const localPath = resolve(temporaryRoot, file);
      const changed = `${await readFile(localPath, "utf8")}\n// mutation\n`;
      await writeFile(localPath, changed);
      provenance.localFiles[file] = createHash("sha256")
        .update(changed)
        .digest("hex");
    },
    { copyLocalFiles: true },
  )).resolves.toEqual(expect.arrayContaining([
    `table pagination: ${file} reviewed local hash drifted`,
    `${file}: local adaptation hash drifted`,
  ]));
});

it("rejects Calendar provenance with one reviewed local key deleted", async () => {
  const file = "src/components/ui/calendar.tsx";
  await expect(mutateCalendarManifest((provenance) => {
    delete provenance.localFiles[file];
  })).resolves.toEqual(expect.arrayContaining([
    "calendar reviewed local adaptation paths drifted",
    `calendar: ${file} reviewed local hash drifted`,
  ]));
});

it("rejects Calendar provenance with an empty local key set", async () => {
  await expect(mutateCalendarManifest((provenance) => {
    provenance.localFiles = {};
  })).resolves.toContain("calendar reviewed local adaptation paths drifted");
});

it("rejects replacing a Calendar local file with README and its real hash", async () => {
  const readmeHash = createHash("sha256")
    .update(await readFile(resolve(root, "README.md")))
    .digest("hex");
  await expect(mutateCalendarManifest((provenance) => {
    delete provenance.localFiles["src/components/ui/calendar.tsx"];
    provenance.localFiles["README.md"] = readmeHash;
  })).resolves.toContain("calendar reviewed local adaptation paths drifted");
});

it("rejects a valid-format mutation of a reviewed Calendar local hash", async () => {
  const file = "src/components/ui/calendar.tsx";
  await expect(mutateCalendarManifest((provenance) => {
    provenance.localFiles[file] = "c".repeat(64);
  })).resolves.toContain(
    `calendar: ${file} reviewed local hash drifted`,
  );
});

it("rejects a Calendar manifest and local file changed to the same new hash", async () => {
  const file = "src/components/ui/calendar.tsx";
  await expect(mutateCalendarManifest(async (provenance, temporaryRoot) => {
    const localPath = resolve(temporaryRoot, file);
    const changed = `${await readFile(localPath, "utf8")}\n// mutation\n`;
    await writeFile(localPath, changed);
    provenance.localFiles[file] = createHash("sha256")
      .update(changed)
      .digest("hex");
  }, { copyLocalFiles: true })).resolves.toEqual(expect.arrayContaining([
    `calendar: ${file} reviewed local hash drifted`,
    `${file}: local adaptation hash drifted`,
  ]));
});

it("rejects a choice provenance local key deletion", async () => {
  const file = "src/components/ui/combobox.tsx";
  await expect(mutateChoiceManifest((provenance) => {
    delete provenance.localFiles[file];
  })).resolves.toEqual(expect.arrayContaining([
    "PC choice fields reviewed local adaptation paths drifted",
    `PC choice fields: ${file} reviewed local hash drifted`,
  ]));
});

it("rejects a choice manifest and local file changed to the same new hash", async () => {
  const file = "src/components/ui/choice-field.tsx";
  await expect(mutateChoiceManifest(async (provenance, temporaryRoot) => {
    const localPath = resolve(temporaryRoot, file);
    const changed = `${await readFile(localPath, "utf8")}\n// mutation\n`;
    await writeFile(localPath, changed);
    provenance.localFiles[file] = createHash("sha256")
      .update(changed)
      .digest("hex");
  }, { copyLocalFiles: true })).resolves.toEqual(expect.arrayContaining([
    `PC choice fields: ${file} reviewed local hash drifted`,
    `${file}: local adaptation hash drifted`,
  ]));
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

it("rejects a valid-format mutation of the pinned media Dialog hash", async () => {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "fcr-media-provenance-"));
  try {
    await cp(
      resolve(root, "docs"),
      resolve(temporaryRoot, "docs"),
      { recursive: true },
    );
    const manifestPath = resolve(
      temporaryRoot,
      "docs/specs/shadcn-base-nova-media-dialog-baseline.json",
    );
    const provenance = JSON.parse(await readFile(manifestPath, "utf8")) as {
      upstream: { files: Record<string, string> };
    };
    const dialogPath = "apps/v4/registry/bases/base/ui/dialog.tsx";
    provenance.upstream.files[dialogPath] = "b".repeat(64);
    await writeFile(manifestPath, `${JSON.stringify(provenance, null, 2)}\n`);

    await expect(verifyUiProvenance({
      manifestRoot: temporaryRoot,
      localRoot: root,
    })).resolves.toContain(
      `media dialog: ${dialogPath} upstream blob hash drifted`,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

it("rejects a valid-format Calendar hash mutation against the trusted registry", async () => {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "fcr-calendar-provenance-"));
  try {
    await cp(
      resolve(root, "docs"),
      resolve(temporaryRoot, "docs"),
      { recursive: true },
    );
    const manifestPath = resolve(
      temporaryRoot,
      "docs/specs/shadcn-base-nova-calendar-baseline.json",
    );
    const provenance = JSON.parse(await readFile(manifestPath, "utf8")) as {
      upstream: { files: Record<string, string> };
    };
    const calendarPath = "apps/v4/registry/bases/base/ui/calendar.tsx";
    provenance.upstream.files[calendarPath] = "b".repeat(64);
    await writeFile(manifestPath, `${JSON.stringify(provenance, null, 2)}\n`);

    await expect(verifyUiProvenance({
      manifestRoot: temporaryRoot,
      localRoot: root,
    })).resolves.toContain(
      `calendar: ${calendarPath} upstream blob hash drifted`,
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
