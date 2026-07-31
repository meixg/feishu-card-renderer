# Visual regression environment

Linux visual baselines have one rendering contract:

- `pnpm-lock.yaml` pins Playwright 1.62.0 and Chromium revision 1234
  (Chrome for Testing 151.0.7922.34). Screenshot workflows install that managed
  browser and its documented Linux dependencies with
  `playwright install --with-deps chromium`.
- `pnpm visual:environment` fails before screenshots when the Playwright
  package, browser revision metadata, browser metadata version, executable
  canonical path, launched runtime version, or required launch contract does
  not match. Revision metadata records Playwright provenance; launching the
  executable and reading `browser.version()` separately proves runtime
  identity. The revision and metadata version come from Playwright-core's
  private `browsers.json` and are provenance-only; that private read is
  isolated, schema-checked, and never treated as runtime authority.
- Every visual run uses one Playwright worker and launches Chromium with
  `--disable-skia-runtime-opts` and `--disable-partial-raster`. The worker rule
  isolates screenshot production and resource use. It is not claimed as the
  pixel root cause: an exact-tree experiment reproduced the same 1,346/3,598
  failures at both two workers and one worker. The two-flag combination formed
  an effective deterministic environment contract on the tested trees,
  GitHub runner images, and managed-browser samples. Chromium's internal flag
  mechanisms were not verified by trace or source inspection.
- `.github/workflows/visual-determinism.yml` runs the complete strict visual
  suite three consecutive times. It captures the Button theme and compact
  invalid Form locators after their normal snapshot assertions, then rejects
  any SHA-256 change between runs.

PR #88's four artifacts do not support pinning the runner label or individual
dpkg versions: all attempts already used Ubuntu 24.04, identical browser and
font packages, and two runner-image releases. The Form output was
byte-identical and the Button output had a one-pixel variant. PR #92 run
`30575919784` reproduced the existing baseline family with one worker, proving
the snapshots were not stale but not isolating causality.

Controlled run `30578180149` then tested the exact PR #88 tree and showed that
both two-worker and one-worker complete runs retained the same broad mismatch.
Targeted original-actual run `30579457566` showed that no flag, disabled GPU,
disabled GPU rasterization, and SwiftShader all left the Button byte-unstable.
Run `30580233647` changed only `--disable-skia-runtime-opts` and produced
identical Button SHA-256 `2552da7c…` and Form SHA-256 `09d495e4…` in all three
processes on the PR #88 tree. On the merged PR tree, a later full proof exposed
one remaining rounded-corner pixel. In controlled run `30582136811`, adding
`--disable-partial-raster` produced identical bytes in that sample, and
ablation run `30582651451` showed reduced-motion was not required in the
sampled two-flag configuration: with or without it, all three
Button hashes were `f3e3ed05…` and all three Form hashes were `01112dcd…`.
Final full run `30582949053` then passed 28/28 three times and reproduced those
exact two hashes in every run; artifact `8775508919` retains all six PNGs and
the hash report.
After merging the latest `main` calendar change, run `30583604134` again
passed 28/28 three times: Button remained `f3e3ed05…` ×3 and the updated Form
was `b4239d16…` ×3 (artifact `8775753037`).
See
[`visual-determinism-evidence.md`](./visual-determinism-evidence.md).

Do not resolve environment drift by changing screenshot thresholds, pixel
budgets, masks, crops, retries, or parallel baselines. Change this contract
deliberately and obtain a fresh three-run determinism proof. Refresh snapshots
only when fixed-environment evidence attributes a genuine baseline change.

Issue #97 baseline audit keeps spacing-driven changes only where the captured
tree contains a multi-child body or affected container flow: the complete
renderer, closed choice/form-control cards, container cards, the all-tags
matrix, and the four new Workspace Form variants. Single-child Markdown,
chart, and table cards plus portal-only Button, choice Drawer, calendar, chart
preview, and image-preview captures cannot contain an affected sibling flow.
The retained
[three-run evidence](./visual-evidence/issue-97-unaffected-refresh.md) links
three independent [manifests](./visual-evidence/issue-97-unaffected-run-1.sha256)
([run 2](./visual-evidence/issue-97-unaffected-run-2.sha256),
[run 3](./visual-evidence/issue-97-unaffected-run-3.sha256)) and their
[per-run status records](./visual-evidence/issue-97-unaffected-run-1.status)
([run 2](./visual-evidence/issue-97-unaffected-run-2.status),
[run 3](./visual-evidence/issue-97-unaffected-run-3.status)). The manifests
cover the exact same 24 files, are byte-identical, and pass `sha256sum -c`
against the current files. Those focused runs are not Issue #97 spacing
evidence; the four Workspace snapshots are this issue's dedicated visual
acceptance evidence.
