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

## Conclusion and fix boundary

The evidence rejects the proposed `ubuntu-24.04` label plus three exact dpkg
version checks:

1. `ubuntu-latest` already selected Ubuntu 24.04 in every attempt.
2. The checked packages, managed browser, and Playwright version were already
   identical.
3. The broad expected-versus-actual failure was stable across all four runs.
4. The only cross-attempt variation was one curved-edge pixel and did not
   correlate with the two runner images.

The broad failures are stale baselines: both actuals repeat across four runs
with the same mismatch, and neither is attributable to PR #88 product code. The
cross-run determinism defect is narrower: 12 parallel Playwright workers leave
process scheduling as an uncontrolled raster input, and the only changing
output is one antialiased curved-edge pixel. The minimal general fix keeps the
already locked Playwright/managed-browser contract, serializes CI screenshot
production, and refreshes only these two artifact-attributed baselines.

An official Playwright Noble image was evaluated and rejected as the fix: a
strict run changed 12 test groups, including one-pixel layout heights, so it
would require a broad unrelated baseline migration. The selected fix does not
add tolerance, masks, crops, retries, or a second baseline.
