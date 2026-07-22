---
name: skel-animations
description: Get the real, ordered animation name list (and Animate/bond-stage grouping) out of a hero's actual .skel file, instead of guessing names from memory or a stale/rebuilt map.json. Use whenever debugging bond sequencing (Animate/BondSequencer/bondRules) for a specific hero/bond id, or any time you need ground truth on what animations a skeleton actually contains and in what order.
---

# Inspecting real .skel animation data

`animate.ts`'s `groupAnimations` is order-and-name sensitive, and heroes'
actual `.skel` files frequently don't match what you'd guess from the naming
convention alone (extra clips, different suffixes, missing stages). Don't
hand-simulate `Animate` against an assumed animation list - get the real
list out of the binary and run it through the actual code.

## Setup (one-time)

`.env` at repo root holds `TEST_GALLERY_DIR`, pointing at a real extracted
gallery-data folder (containing `containers/`) - see `.env.example`. This is
gitignored; it's local machine state, not project config. If missing, ask
the user for their gallery-data path (commonly
`%LOCALAPPDATA%\com.arkrecodegallery.gallery\gallery-data` on the same
machine that runs the Tauri app) rather than guessing.

## Running the inspector

```
SKEL_ID=<hero or bond id, or any path fragment> npx vitest run --config scripts/vitest.scripts.config.ts
```

Optionally add `HERO_ID=<id>` to also apply that hero's `bondRules.ts`
override (skip/rename/disable) before grouping, exactly as the app would.

`SKEL_ID` is matched case-insensitively as a substring against `.skel`
paths under `$TEST_GALLERY_DIR/containers`, so a bond id (`A0145`) or hero
id (`H003`) both work; every matching file is printed.

This runs `scripts/extract-skel-animations.test.ts`, which:
1. Parses the `.skel` binary with spine-core's real `SkeletonBinary` reader
   (with a stub `AttachmentLoader` - no atlas/texture needed) to get the
   true, in-order animation name list.
2. Feeds that list into the actual `Animate` class and prints the resulting
   stage groups (`stop` + `bypass` per stage), plus the background channel.

Output looks like:

```
=== C:\...\containers\Assets\Game\CG\A0145\A0145\A0145.skel ===
  [0] 00_Idle_ani
  [1] 01_Idle_hand_ani
  ...

  -- Animate grouping (bond stages) --
  stage 0: stop=00_Idle_ani  bypass=[01_Idle_hand_ani, 02_Take_off_ani]
  stage 1: stop=05_Idle_ani
  ...
```

## Why this is a separate vitest config

`scripts/extract-skel-animations.test.ts` lives outside `src/`, so it's
excluded from `vitest.config.ts`'s `include: ["src/**/*.test.ts"]` and never
runs as part of `npm run test`. It's a dormant diagnostic tool, not a test -
invoke it explicitly via `scripts/vitest.scripts.config.ts` whenever you
need ground truth. Plain `node` can't run it directly: `@esotericsoftware/
spine-core`'s `dist/*.js` uses extensionless internal imports that only
resolve under a bundler-aware loader (Vite/vitest), not raw Node ESM.

## Extending the stub AttachmentLoader

If parsing a new `.skel` throws inside `SkeletonBinary.readSkin`/
`readAttachment` (e.g. `Region not set.`, `mesh.updateRegion is not a
function`), it's because some attachment type needs more stubbed state
before `updateRegion()` runs. The fix is always the same shape: use the
real spine-core attachment classes (not plain objects) and give them a
minimal non-`TextureAtlasRegion` `.region` (`{ u: 0, v: 0, u2: 1, v2: 1 }`)
so `updateRegion()` takes its simple, atlas-free code path instead of
throwing or reaching into a real texture.
