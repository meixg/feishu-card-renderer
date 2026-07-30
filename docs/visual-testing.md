# Visual regression environment

Linux visual baselines have one rendering contract:

- `pnpm-lock.yaml` pins Playwright 1.62.0 and Chromium revision 1234
  (Chrome for Testing 151.0.7922.34). Screenshot workflows install that managed
  browser and its documented Linux dependencies with
  `playwright install --with-deps chromium`.
- `pnpm visual:environment` fails before screenshots when the Playwright
  package, browser revision, browser version, or CI executable does not match.
- CI uses one Playwright worker. The four PR #88 attempts used 12 workers and
  produced a raster output different from the existing single-worker baseline,
  including a one-pixel cross-attempt curved-edge variant despite identical
  logged runner, browser, and font versions. Serial screenshot production
  removes that uncontracted process-scheduling input without changing
  assertions or snapshots.
- `.github/workflows/visual-determinism.yml` runs the complete strict visual
  suite three consecutive times. It captures the Button theme and compact
  invalid Form locators after their normal snapshot assertions, then rejects
  any SHA-256 change between runs.

PR #88's four artifacts do not support pinning the runner label or individual
dpkg versions: all attempts already used Ubuntu 24.04, identical browser and
font packages, and two runner-image releases. The Form output was byte-identical
and the Button output had one cross-attempt pixel variation. PR #92 run
`30575919784` then used one worker and reproduced the existing baseline family;
artifact `8772767855` from companion Full Quality run `30575919773` shows only
2 Button and 33 Form exact-pixel differences from the existing baselines, both
within the strict Playwright comparison. The root defect was parallel
screenshot rasterization, not stale baselines, the media-dialog change, or a
moving OS/package version. See
[`visual-determinism-evidence.md`](./visual-determinism-evidence.md).

Do not resolve environment drift by changing screenshot thresholds, pixel
budgets, masks, crops, retries, or parallel baselines. Change this contract
deliberately and obtain a fresh three-run determinism proof. Refresh snapshots
only when fixed-environment evidence attributes a genuine baseline change.
