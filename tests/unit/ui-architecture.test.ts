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

async function mutateCalendarManifest(
  mutation: (provenance: {
    localFiles: Record<string, string>;
  }, temporaryRoot: string) => Promise<void> | void,
  { copyLocalFiles = false } = {},
) {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "fcr-calendar-local-"));
  try {
    await cp(resolve(root, "docs"), resolve(temporaryRoot, "docs"), {
      recursive: true,
    });
    if (copyLocalFiles) {
      await cp(resolve(root, "src"), resolve(temporaryRoot, "src"), {
        recursive: true,
      });
    }
    const manifestPath = resolve(temporaryRoot, calendarManifest);
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
    overlays: "docs/specs/shadcn-base-nova-overlays-baseline.json",
    containers: "docs/specs/shadcn-base-nova-containers-baseline.json",
    calendar: calendarManifest,
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
