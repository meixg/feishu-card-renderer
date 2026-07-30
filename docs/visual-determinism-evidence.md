# PR #88 visual determinism evidence

Collected 2026-07-31 from PR #88 run `30572118172`, merge SHA
`93b49059aab5255a69846b33b46ce0fd41e8fd53`. The four failure artifacts and
all four run-attempt logs were downloaded through the GitHub Actions API and
unpacked. GitHub reports these artifact archive digests:

| Attempt | Job ID | Artifact ID (name) | Artifact archive SHA-256 |
| --- | ---: | ---: | --- |
| 1 | `90971160361` | `8771294034` (`visual-failure-1`) | `e718f72349e614b0d83963292e326cc2b8a66ed5c58ea9db61affa8165f50b23` |
| 2 | `90972317241` | `8771416870` (`visual-failure-2`) | `12359459d737530a190d637f42327209f3e2461df4a71846702465aa0f9d9bee` |
| 3 | `90973393440` | `8771539189` (`visual-failure-3`) | `954452e476d5f88521b5f2c2699397329444c00af53aac4db82ad8ef327952ef` |
| 4 | `90974442466` | `8771657195` (`visual-failure-4`) | `cfa000a24c0f893cef8ba01b8861d75aa21db81d4c83f77bd30aa468d98e3e28` |

## PNG findings

All expected and actual files are 8-bit RGB PNGs; Playwright's diff files are
8-bit RGBA. Hashes are over the unpacked PNG bytes.

### `button-base-nova-themes`

Dimensions: `1264x487`.

| Artifact | Expected SHA-256 | Actual SHA-256 | Diff SHA-256 |
| ---: | --- | --- | --- |
| `8771294034` | `b189c00ebfc5b164d5d8ddf3947399f97582e6011d3f9b8e5668c1728958dc79` | `0c28f261a3c3a55278bd885c15e41a0e58eb53229db01245d228ef93036c161c` | `c1f09e6204091eed42f1df2d0a7d5ef900d1d5b5dadb860ba02312aa1a735ef1` |
| `8771416870` | `b189c00ebfc5b164d5d8ddf3947399f97582e6011d3f9b8e5668c1728958dc79` | `1e45cd2227abfaf342e901873573b990f9e3910c97475ba58fc1c07fd2de8b47` | `c1f09e6204091eed42f1df2d0a7d5ef900d1d5b5dadb860ba02312aa1a735ef1` |
| `8771539189` | `b189c00ebfc5b164d5d8ddf3947399f97582e6011d3f9b8e5668c1728958dc79` | `0c28f261a3c3a55278bd885c15e41a0e58eb53229db01245d228ef93036c161c` | `c1f09e6204091eed42f1df2d0a7d5ef900d1d5b5dadb860ba02312aa1a735ef1` |
| `8771657195` | `b189c00ebfc5b164d5d8ddf3947399f97582e6011d3f9b8e5668c1728958dc79` | `0c28f261a3c3a55278bd885c15e41a0e58eb53229db01245d228ef93036c161c` | `c1f09e6204091eed42f1df2d0a7d5ef900d1d5b5dadb860ba02312aa1a735ef1` |

Each log reports exactly 1,346 Playwright-significant pixels (ratio `0.01`).
An exact RGB comparison finds 15,222 changed pixels and an any-delta bounding
box of `600x487+0+0`; the pixels outside the left 600-pixel card are identical.
The grayscale absolute-delta distribution is:

| Delta | 0 | 1–15 | 16–31 | 32–63 | 64–127 | 128–255 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Pixels | 600,450 | 3,739 | 8,414 | 1,534 | 78 | 1,353 |

Attempts 1, 3, and 4 are byte-identical. Attempt 2 differs from them at exactly
one pixel: `(23,376)` is `#FEF2F3` in attempts 1/3/4 and `#FDF0F1` in attempt
2. This explains the two actual SHA-256 values, but not the stable 1,346-pixel
baseline failure.

### `card-form-controls-error-compact`

Dimensions: `358x543`.

| Artifact | Expected SHA-256 | Actual SHA-256 | Diff SHA-256 |
| ---: | --- | --- | --- |
| `8771294034` | `145f6935ae6ed073d70fa45fa2681298ba357f36d409692c65b500844d26a32b` | `09d495e4cb170d85c91bcb75f9d4771f326aa167f2094436de74c6396ccdd0a6` | `9b50d6aa4d95b6d88b806c7e7103ad1085eff52f7e109b815bf69e8d3bb00ba7` |
| `8771416870` | `145f6935ae6ed073d70fa45fa2681298ba357f36d409692c65b500844d26a32b` | `09d495e4cb170d85c91bcb75f9d4771f326aa167f2094436de74c6396ccdd0a6` | `9b50d6aa4d95b6d88b806c7e7103ad1085eff52f7e109b815bf69e8d3bb00ba7` |
| `8771539189` | `145f6935ae6ed073d70fa45fa2681298ba357f36d409692c65b500844d26a32b` | `09d495e4cb170d85c91bcb75f9d4771f326aa167f2094436de74c6396ccdd0a6` | `9b50d6aa4d95b6d88b806c7e7103ad1085eff52f7e109b815bf69e8d3bb00ba7` |
| `8771657195` | `145f6935ae6ed073d70fa45fa2681298ba357f36d409692c65b500844d26a32b` | `09d495e4cb170d85c91bcb75f9d4771f326aa167f2094436de74c6396ccdd0a6` | `9b50d6aa4d95b6d88b806c7e7103ad1085eff52f7e109b815bf69e8d3bb00ba7` |

Every expected, actual, and diff file is byte-identical across all attempts.
Each log reports exactly 3,598 Playwright-significant pixels (ratio `0.02`).
An exact RGB comparison finds 14,093 changed pixels with bounding box
`358x543+0+0`. The grayscale absolute-delta distribution is:

| Delta | 0 | 1–15 | 16–31 | 32–63 | 64–127 | 128–255 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Pixels | 180,378 | 2,104 | 5,908 | 2,147 | 1,679 | 2,178 |

## Runner, browser, and font evidence

All four attempts used runner `2.336.0`, Ubuntu 24.04, Playwright `1.62.0`,
Chrome for Testing `151.0.7922.34`, Chromium revision `1234`, and the same
logged raster/font packages:

- `libfontconfig1` / fontconfig `2.15.0-1.1ubuntu2`
- `libfreetype6` `2.13.2+dfsg-1ubuntu0.1`
- `fonts-liberation` `1:2.1.5-3`
- `fonts-noto-color-emoji` `2.047-0ubuntu0.24.04.1`
- Playwright-installed `fonts-ipafont-gothic` `00303-21ubuntu1`,
  `fonts-freefont-ttf` `20211204+svn4273-2`, `fonts-tlwg-loma-otf`
  `1:0.7.3-1`, `fonts-unifont` `1:15.1.01-1build1`, and
  `fonts-wqy-zenhei` `0.9.45-8`

Attempts 1 and 4 used runner image `ubuntu24/20260720.247` (image version
`20260720.247.2`); attempts 2 and 3 used `ubuntu24/20260726.254` (image version
`20260726.254.1`). The Form bytes are identical across those images, and the
Button's one-pixel variant does not correlate with image release: attempt 3 on
the newer image matches attempts 1 and 4 on the older image.

## PR #92 evidence before the controlled experiment

PR #92 run `30575919784` tested head
`3fe1667019cd6ffed2f532cbb48896a112d134f3` through synthetic merge commit
`86f407363b8be12ecfe788cc81ebe67b8161533b`. The checkout log confirms that
merge commit, and its tree contains the PR's replacement snapshot blobs rather
than the `origin/main` blobs. The run nevertheless reported the same
1,346/3,598 mismatch counts because expected and actual raster families had
been reversed.

Full Quality run `30575919773` at the same PR head uploaded artifact
`8772767855` (`visual-failure-1`, archive SHA-256
`678c42d4579bea9345281b7604e5b0ffdf63247615ddff498e125c4766938bea`).
It proves that CI read the replacement PNGs as expected:

| Snapshot | Replacement expected SHA-256 | One-worker actual SHA-256 | Existing `origin/main` SHA-256 | Exact pixels different from existing baseline |
| --- | --- | --- | --- | ---: |
| Button | `0c28f261a3c3a55278bd885c15e41a0e58eb53229db01245d228ef93036c161c` | `b7ae04c89b22f31fe3775627659768ad9a8cd3eca340bea618c35b26c34e9490` | `b189c00ebfc5b164d5d8ddf3947399f97582e6011d3f9b8e5668c1728958dc79` | 2 |
| Form | `09d495e4cb170d85c91bcb75f9d4771f326aa167f2094436de74c6396ccdd0a6` | `e811b3336e9148fcaa675be1ae326fb5bcaaf48bbdd18c9bdf30391021f28ef5` | `145f6935ae6ed073d70fa45fa2681298ba357f36d409692c65b500844d26a32b` | 33 |

The one-worker actuals reproduced the existing baselines within Playwright's
strict screenshot comparison. Their byte hashes differ because of 2 and 33
sub-threshold antialiasing pixels. This run proved that the snapshots were not
stale, but did not isolate worker count: it used a different PR tree and test
sequence from PR #88.

## Controlled worker-count experiment

Run `30578180149`, job `90991554072`, checked out PR #88 HEAD
`93b49059aab5255a69846b33b46ce0fd41e8fd53` on one Ubuntu 24.04 runner and
changed only Playwright's CLI worker override. Artifact `8773825336`
(`pr88-worker-experiment-30578180149`, archive SHA-256
`7987d2160fd401f3b11c70c4aee193485a083108edcdbf9c21c496e6d6820475`)
retains the checkout, config, runtime/font records, logs, and observation PNGs.

Both worker settings failed all three complete strict runs with exactly the
same 1,346 Button and 3,598 Form significant-pixel mismatches:

| Workers | Runs | Button observation SHA-256 | Form observation SHA-256 |
| ---: | ---: | --- | --- |
| 2 | 1–3 | `0c28f261…` each time | `09d495e4…` each time |
| 1 | 1–2 | `1e45cd22…` | `09d495e4…` |
| 1 | 3 | `2552da7c…` | `09d495e4…` |

The log says `Running 27 tests using 2 workers`; the earlier description of
PR #88 as a 12-worker run was incorrect. More importantly, serial execution
did not restore the baseline. Worker count is therefore not the pixel-change
cause. One worker remains an isolation and resource-governance rule, not the
raster determinism fix.

## Controlled raster-contract experiment

The first targeted attempt (`30579253678`, artifact `8773978571`) matched no
tests because its grep was wrong and is excluded. Valid run `30579457566`, job
`90995779619`, artifact `8774264263`
(`pr88-raster-experiment-30579457566`, archive SHA-256
`ab7579267aa54a60012529c8d6e3cd2fd7d355dcadd0013221a020bf5da063dd`)
again checked out exact PR #88 HEAD on one runner. It removed the extra
pre-assertion capture and retained Playwright's original failing `*-actual.png`
files. Each condition used one worker and differed only by one Chromium launch
flag:

| Launch condition | Button actuals, runs 1/2/3 | Form actuals, runs 1/2/3 | Result |
| --- | --- | --- | --- |
| no extra flag | `0c28…`, `1e45…`, `2552…` | `09d4…` ×3 | Button unstable |
| `--disable-gpu` | `0c28…`, `1e45…`, `2552…` | `09d4…` ×3 | Button unstable |
| `--disable-gpu-rasterization` | `0c28…`, `2552…`, `0c28…` | `09d4…` ×3 | Button unstable |
| `--use-gl=swiftshader` | `0c28…`, `0c28…`, `2552…` | `09d4…` ×3 | Button unstable |
| `--deterministic-mode` | no PNG | no PNG | browser actions timed out; invalid |

This proves the three Button byte hashes are produced by Playwright's original
screenshot assertion, not by the earlier observation instrumentation.

A final single-variable run tested only
`--disable-skia-runtime-opts`: run `30580233647`, job `90998358050`, artifact
`8774343305` (`pr88-raster-experiment-30580233647`, archive SHA-256
`8c66dfa524bbf78490977ce69fd454906356427606d6b7a2a898670680843fb6`).
Across three fresh processes, both original actual files were byte-identical:

| PNG | Runs 1/2/3 SHA-256 |
| --- | --- |
| Button | `2552da7c45f795166ef754e6fb715eade220c552d1160f74170dacdd4f56f789` ×3 |
| Form | `09d495e4cb170d85c91bcb75f9d4771f326aa167f2094436de74c6396ccdd0a6` ×3 |

This established the Skia runtime flag as necessary evidence on the PR #88
tree, but a full merged-head proof later found one remaining rounded-corner
pixel phase in its separate post-assertion evidence screenshot.

## Merged-head compositor experiment

Final-head proof run `30581037807` passed the complete 28-test suite three
times, but its Button evidence hashes were `f3e3ed05…`, `f3e3ed05…`, and
`29e76227…`; Form stayed `01112dcd…`. The only changed pixel was `(23,377)`,
at the host-danger rounded corner (`#FEF4F5` versus `#FDF0F1`). This was a
real pixel difference, not PNG metadata.

Run `30582136811`, job `91004723596`, artifact `8775179341`
(`compositor-experiment-30582136811`, archive SHA-256
`5d33e7866cd3999deaf47f1dbca6f3da56f14fa6e7dd6a7b502bf4f2aa93ff30`)
held the merged PR tree, one worker, managed browser, Skia runtime flag, and
test selection constant. It changed one additional launch flag at a time:

| Incremental flag | Button runs | Form runs | Result |
| --- | --- | --- | --- |
| none | `29e76227…` ×3 | `01112dcd…` ×3 | stable in this sample, but contradicted by the preceding full run |
| `--disable-partial-raster` | `f3e3ed05…` ×3 | `01112dcd…` ×3 | stable |
| `--disable-zero-copy` | `29e76227…`, `29e76227…`, `f3e3ed05…` | `01112dcd…` ×3 | unstable |
| `--disable-threaded-compositing` | no PNG | no PNG | browser actions timed out; invalid |

The reduction check run `30582651451`, job `91006466201`, artifact
`8775270477` (archive SHA-256
`810e37c047478230df74d60504c9ff1a2c43e1b43acf0e7deffeddbe3248615a`)
then compared `--disable-partial-raster` with and without reduced-motion.
Both conditions produced Button `f3e3ed05…` and Form `01112dcd…` in all three
runs. Reduced-motion is therefore not part of the contract.

The experimentally supported minimal raster contract is the managed Chromium
plus `--disable-skia-runtime-opts` and `--disable-partial-raster`. These flags
control CPU-specific Skia paths and partial tile rasterization; they do not
change screenshot assertions or tolerated differences.

Final full-suite proof run `30582949053`, job `91007471288`, tested commit
`82d8e39b993b30d8009716fd825b4f1c6a6bdc98`. All three consecutive runs
passed 28/28 with one worker. Artifact `8775508919`
(`final-head-visual-determinism-30582949053`, archive SHA-256
`688b3521f3c61205318733b1416c977a1a425ff179f6a34567b76253c27209a3`)
retains all six PNGs and `hashes.json`:

| PNG | Bytes | Runs 1/2/3 SHA-256 |
| --- | ---: | --- |
| Button | 29,908 | `f3e3ed05c8142419a18dd674d3b888a11decee3bdcca14fb30afdfd26da59983` ×3 |
| Form | 28,159 | `01112dcd19801af8693de66c4292f5d88ed6a4e7c93aaedcd9bf8c1251e2e9b1` ×3 |

The same run launched and queried managed Chromium `151.0.7922.34` with both
required flags. The later cleanup commit changes only the temporary dispatch
adapter back to the normal baseline-refresh workflow.

After `main` advanced with its calendar work, latest-head proof run
`30583604134`, job `91009658453`, tested commit
`742fee1f3a06c459bfba6af318559dba2fd18b69`. It again passed 28/28 three
times. Artifact `8775753037` (`latest-head-visual-determinism-30583604134`,
archive SHA-256
`61f49f9ad14bc6a271e2f4388dd77c0795e96342bba8cf3ea00d4e8a75504972`)
retains Button `f3e3ed05c8142419a18dd674d3b888a11decee3bdcca14fb30afdfd26da59983`
three times and the updated-main Form
`b4239d16493e8c99cc0b35c58a003636f1be6be77a10d2f778e5db934f1e85a4`
three times. The cleanup after this run restores only the dispatch adapter.

## Conclusion and fix boundary

The evidence rejects the proposed `ubuntu-24.04` label plus three exact dpkg
version checks:

1. `ubuntu-latest` already selected Ubuntu 24.04 in every attempt.
2. The checked packages, managed browser, and Playwright version were already
   identical.
3. The broad expected-versus-actual failure was stable across all four
   two-worker runs.
4. The only cross-attempt variation was one curved-edge pixel and did not
   correlate with the two runner images.

The existing baselines were not stale, but worker count did not cause PR #88's
different raster family. The minimal proven environment contract keeps the
locked Playwright/managed-browser contract, fixes the raster path with
`--disable-skia-runtime-opts` and `--disable-partial-raster`, uses one worker
for isolation, preserves existing snapshots, and uses the three-run hash proof
to detect future nondeterminism. The browser verifier launches that exact
managed executable with the required flags and checks `browser.version()`; revision and browser
version from Playwright's `browsers.json` are locked provenance metadata, not
a substitute for runtime verification.

An official Playwright Noble image was evaluated and rejected as the fix: a
strict run changed 12 test groups, including one-pixel layout heights, so it
would require a broad unrelated baseline migration. The selected fix does not
add tolerance, masks, crops, retries, or a second baseline.
