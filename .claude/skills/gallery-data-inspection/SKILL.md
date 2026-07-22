---
name: gallery-data-inspection
description: Use a real TEST_GALLERY_DIR (map.json, missing.json, containers/) as ground truth instead of guessing paths, ids, or data shapes from memory. Use whenever you need to confirm how a hero/bond/collection entry is actually structured, check whether something is a known-missing case, or find naming patterns across many heroes by grepping the raw game files.
---

# Inspecting real gallery-data

The backend pipeline (`src-tauri/src`) generates `map.json` and
`missing.json` from a user's extracted game data folder. Rather than
reasoning about data shapes or naming conventions from the Rust/TS source
alone, read the real generated output and raw extracted files directly -
they're ground truth for what the game actually contains, including all
the irregular cases `rules.rs`/`bondRules.ts` exist to work around.

## Setup

`.env` at repo root holds `TEST_GALLERY_DIR`, pointing at a real extracted
gallery-data folder - see `.env.example`. This is gitignored; it's local
machine state, not project config. If missing, ask the user for their
gallery-data path (commonly `%LOCALAPPDATA%\com.arkrecodegallery.gallery\
gallery-data` on the same machine that runs the Tauri app) rather than
guessing. The folder contains:

```
<TEST_GALLERY_DIR>/
  assets.xml       # AssetStudio manifest the backend indexes (AssetLookup)
  map.json          # generated output the frontend actually reads
  missing.json      # generated log of lookup failures during the run
  containers/        # the raw extracted game files (Sprite/TextAsset/Texture2D dumps)
```

## `map.json` - the structure the app consumes

One object keyed by hero id (`H001`, `H002`, ...), each value shaped like
the `Entry` struct in `src-tauri/src/entry/mod.rs` / `src/lib/core/
types.ts`: `icons`, `details`, `hero` (skel+atlas bundle), `skill`, `bond`
(array of `{ kind: "animated", bundle, motions }` or `{ kind: "stills",
images }`), `collection` (image paths). Bond/collection ids inside
(`A0002`, ...) are the game's own asset ids, not derived from the hero id.

Use this when you need a real example of a specific field shape, or to
confirm what a specific hero's data actually looks like end-to-end (e.g.
"does H067 have an animated bond or stills?") rather than tracing the
whole pipeline by hand. Prefer reading a couple of representative entries
over the whole file - it's large.

## `missing.json` - known gaps, don't chase them as new bugs

Shaped as `{ log: { "<hero id>": { "<Category>": ["<message>", ...] } } }`
where category is one of `Hero`/`Bond`/`Collection`/etc and messages
follow patterns like `Missing skel or atlas (id 'H169')` or `Missing image
(id 'A0261')`. This is the accumulated `Missing` output (`missing.rs`)
from the last real pipeline run against this data folder.

Check this file **before** assuming a hero/asset issue you're debugging is
a regression - if it's already logged here, it's a known data gap (missing
source files in the user's extraction), not a bug in the gallery code.

## `containers/` - the raw extracted files, for pattern-hunting

Mirrors the game's own asset folder layout, e.g. `Assets/Game/Hero/H001/`
(hero bundle, skill bundle, icons, skill prefabs/materials) and
`Assets/Game/CG/A0002/` (a bond bundle by its own id). Use this when
`map.json` doesn't have enough - e.g. you need to see every `.skel` file
matching a naming pattern across many heroes, check whether an expected
file exists at all before adding a `rules.rs`/`bondRules.ts` exception, or
confirm a container path convention before hardcoding it.

Typical approaches:

```
# find every skel under a hero/bond id
Glob: <TEST_GALLERY_DIR>/containers/**/H067*/**/*.skel

# grep assets.xml for how a container path maps to source files
Grep "A0040" in <TEST_GALLERY_DIR>/assets.xml
```

For actually parsing `.skel` binaries (animation names/order), don't hand
grep the binary - use the `skel-animations` skill instead, which decodes
it with spine-core's real reader.

## Don't treat this as fixture data

This folder is one user's real extraction, not a repo fixture - it's
gitignored and machine-specific. Don't hardcode assumptions from a single
run (e.g. exact `missing.json` contents, or that a given hero id exists)
into source or tests; use it to verify/derive patterns, not as a stable
dataset other environments will have.
