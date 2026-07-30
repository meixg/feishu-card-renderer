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
  identity.
- Every visual run uses one Playwright worker and launches Chromium with
  `--disable-skia-runtime-opts`. The worker rule isolates screenshot production
  and resource use. It is not claimed as the pixel root cause: an exact-tree
  experiment reproduced the same 1,346/3,598 failures at both two workers and
  one worker. The Skia flag is the experimentally proven determinism control.
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
processes. See
[`visual-determinism-evidence.md`](./visual-determinism-evidence.md).

Do not resolve environment drift by changing screenshot thresholds, pixel
budgets, masks, crops, retries, or parallel baselines. Change this contract
deliberately and obtain a fresh three-run determinism proof. Refresh snapshots
only when fixed-environment evidence attributes a genuine baseline change.
