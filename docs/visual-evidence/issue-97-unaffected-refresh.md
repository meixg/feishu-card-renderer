# Issue #97 unaffected visual refresh evidence

This artifact covers only the 11 environment-refresh test groups whose 24
snapshots cannot contain an Issue #97 affected sibling flow. It is not spacing
acceptance evidence. The spacing-affected snapshots are the five complete
renderer variants, three container variants, three form-control variants,
twelve all-tags matrix variants, the PC compact closed-choice card, and four
new Workspace Form variants.

## Pinned environment

Recorded 2026-07-31 (Asia/Shanghai) by `pnpm visual:environment`, exit 0:

```json
{"playwright":"1.62.0","chromiumRevision":"1234","chromiumMetadataVersion":"151.0.7922.34","chromiumRuntimeVersion":"151.0.7922.34","chromiumArgs":["--disable-skia-runtime-opts","--disable-partial-raster"],"chromiumExecutable":"/home/meixg/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome"}
```

Exact focused command, unchanged for all three consecutive runs:

```sh
pnpm exec playwright test --grep 'Markdown code scrolls|Markdown native theme|chart light, dark, and mobile|chart preview dialog|Button tokens|image Dialog|mobile choices use a keyboard-safe Drawer|400px dark mobile Drawer|390px mobile person Drawer|PC Calendar|table pagination'
```

| Run | Started | Finished | Status | Result |
| --- | --- | --- | --- | --- |
| 1 | 2026-07-31T22:18:21+08:00 | 2026-07-31T22:18:50+08:00 | 0 | 11 passed |
| 2 | 2026-07-31T22:19:51+08:00 | 2026-07-31T22:20:16+08:00 | 0 | 11 passed |
| 3 | 2026-07-31T22:21:26+08:00 | 2026-07-31T22:21:48+08:00 | 0 | 11 passed |

Each row is retained independently in
[`run-1.status`](./issue-97-unaffected-run-1.status),
[`run-2.status`](./issue-97-unaffected-run-2.status), and
[`run-3.status`](./issue-97-unaffected-run-3.status). Immediately after each
successful run, the exact 24 documented PNG paths were hashed into
[`run-1.sha256`](./issue-97-unaffected-run-1.sha256),
[`run-2.sha256`](./issue-97-unaffected-run-2.sha256), and
[`run-3.sha256`](./issue-97-unaffected-run-3.sha256), respectively.

The three retained manifests were verified byte-identical with `cmp`, and
each was verified against the current repository files with `sha256sum -c`;
all commands exited 0. This proves that these 24 current files matched after
each of the three successful focused runs. It does not prove spacing behavior
or make claims about snapshots outside the manifests.
