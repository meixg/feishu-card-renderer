# Visual regression environment

Linux visual baselines have one rendering contract:

- `pnpm-lock.yaml` pins Playwright 1.62.0 and Chromium revision 1234
  (Chrome for Testing 151.0.7922.34). Screenshot workflows install that managed
  browser and its documented Linux dependencies with
  `playwright install --with-deps chromium`.
- `pnpm visual:environment` fails before screenshots when the Playwright
  package, browser revision, browser version, or CI executable does not match.
- CI uses one Playwright worker. The four PR #88 attempts used 12 workers and
  produced a one-pixel curved-edge variant despite identical logged runner,
  browser, and font versions. Serial screenshot production removes that
  uncontracted process-scheduling input without changing assertions.
- `.github/workflows/visual-determinism.yml` runs the complete strict visual
  suite three consecutive times. It captures the Button theme and compact
  invalid Form locators after their normal snapshot assertions, then rejects
  any SHA-256 change between runs.

PR #88's four artifacts do not support pinning the runner label or individual
dpkg versions: all attempts already used Ubuntu 24.04, identical browser and
font packages, and two runner-image releases. The Form output was byte-identical
and the Button output had one cross-attempt pixel variation. The checked-in
baselines nevertheless differed by the same broad raster distribution in every
attempt. The root defect was parallel screenshot rasterization combined with
two stale baselines, not the media-dialog change or a moving OS/package version.
See
[`visual-determinism-evidence.md`](./visual-determinism-evidence.md).

Do not resolve environment drift by changing screenshot thresholds, pixel
budgets, masks, crops, retries, or parallel baselines. Change this contract
deliberately, run the artifact-only baseline refresh once, attribute every
changed PNG, and obtain a fresh three-run determinism proof.
