import { expect, it } from "vitest";

import {
  verifyUiArchitecture,
  verifyUiProvenance,
} from "../../scripts/verify-ui-architecture.mjs";

it("keeps Base UI behind the internal UI module and Lucide imports tree-shakable", async () => {
  await expect(verifyUiArchitecture()).resolves.toEqual([]);
});

it("pins the reviewed base-nova inputs and local adaptations without vendoring snapshots", async () => {
  await expect(verifyUiProvenance()).resolves.toEqual([]);
});
