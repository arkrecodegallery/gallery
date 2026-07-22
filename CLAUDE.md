# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ark Re:Code Gallery ("Gallery") is a Tauri 2 desktop app for viewing Spine skeletal models extracted from the gacha game *Ark Re:Code*. It is "bring-your-own-files": at first launch the user points it at a data folder containing an `assets.xml` manifest and a `containers` directory of extracted game files (Sprite/TextAsset/Texture2D dumps, typically produced by AssetStudio). See `GUIDE.md` for the exact expected folder layout and `TODO.md` for known bugs / in-progress design notes on bond animation sequencing.

The app has two halves that only talk to each other through one Tauri command and one generated JSON file:

- **Rust backend** (`src-tauri/src`): a one-shot data pipeline that scans the user's data folder and emits `gallery-data/map.json`.
- **Svelte 5 frontend** (`src`): reads `map.json`, drives an Esoteric Software Spine WebGL canvas, and renders the browsing UI (data table of heroes, a Spine viewer, keyboard-driven navigation).

There is no persistent backend process and no live backend↔frontend messaging beyond that single `invoke("generate_map", ...)` call — everything after that is the frontend reading static JSON plus streaming binary assets from disk via Tauri's asset protocol.

## Commands

Frontend (run from repo root):

```
npm run dev            # vite dev server (also what Tauri's beforeDevCommand runs)
npm run build           # vite build (svelte-kit adapter-static)
npm run check           # svelte-kit sync + svelte-check (type checking)
npm run test             # vitest run (single run, not watch)
npx vitest run src/lib/core/animate.test.ts   # run a single test file
npx vitest run -t "test name substring"        # run tests matching a name
```

Tauri app (from repo root — requires Rust toolchain):

```
npx tauri dev            # full app w/ hot reload (spawns `npm run dev` itself)
npx tauri build           # production build/bundle
```

Rust backend (from `src-tauri`):

```
cargo build
cargo test                                              # unit tests
TEST_DATA_PATH=<path-to-real-data-folder> cargo test runner   # integration test that runs the actual pipeline against real extracted game data (see commands.rs); requires a local gallery-data folder, not present in the repo
```

No lint/format command is configured beyond `svelte-check`; there's no ESLint/Prettier/rustfmt CI step defined in this repo.

## Backend architecture (`src-tauri/src`)

Entry point is the single Tauri command `generate_map` in `commands.rs`. It builds a few lookup structures once, then threads them through a `GalleryContext` reference (`entry/mod.rs`) rather than passing each table individually:

- `AssetLookup` (`assets.rs`) — indexes files under `containers/` by container path, keyed off `assets.xml`.
- `VariableLookup` (`variables.rs`) — indexes the game's own CSV/data tables (e.g. `RoleCollection.txt`) referenced by `constants.rs` field/file name constants.
- `Rules` (`rules.rs`) — hardcoded, per-hero-ID exceptions for data that doesn't follow the game's normal naming/structure conventions (irregular file paths, alt-skin detection regexes, extra unlisted heroes, which `RoleCollection` prefab patterns are worth parsing). **This is where new heroes/edge cases get special-cased** — check here first when a hero's data looks wrong or missing.

For each hero ID, `Entry::new` (`entry/mod.rs`) assembles one `Entry` by delegating to submodules under `entry/`:
- `hero.rs` — main/alt hero bundles (skel+atlas pairs)
- `details.rs` — display metadata + icon paths
- `bond.rs` — bond ("intimacy") presentations, which are either `Animated { bundle, motions }` (a real Spine skeleton) or `Stills { images }` (just a set of PNGs) — see `BondPresentation`
- `collection.rs` — CG/gallery collection entries

Any lookup failure worth surfacing to the user (not a hard error) goes through `Missing` (`missing.rs`), which is accumulated during the whole run and serialized to `gallery-data/missing.json` alongside `map.json` — check this file when debugging why a hero/asset didn't show up rather than only looking at Rust panics.

The Rust and TypeScript `types.ts`/`entry/*.rs` struct shapes are **kept in sync by hand** — there's no shared schema generation. When changing a serialized field on the Rust side (`Entry`, `BondPresentation`, `Bundle`, etc.), update `src/lib/core/types.ts` to match.

## Frontend architecture (`src`)

State is centralized in two Svelte 5 rune-based singletons under `src/lib/hooks`, both exported as module-level instances (`store`, referenced via `ModelState` composed inside it):

- `state.svelte.ts` — the `Store`: loaded `map.json` data, current `view` (`hero | alt | skill | bond | collection`), the shared `AssetManager`, the active `skeletonData`, and the data-table (`@tanstack/table-core`) sorting/filter state.
- `modelState.svelte.ts` — the `ModelState`: everything about *what's currently showing* — hero index, skin, active animations, and bond-view sequencing state. Keyboard input (`keybinds.ts`) is wired directly into this class's constructor and mutates its state; it does not go through a separate event/dispatch layer.

`core/app.ts`'s `App` class implements Spine WebGL's `SpineCanvasApp` and is the render loop: `initialize` → `loadModel`/`configureScene` once, then `update`/`render` every frame. It polls `store.modelState.has*Update()` flags each frame to decide whether to reload the skin, animation track, or whole model — those flags are set by `ModelState` in response to keybinds or view changes, not pushed directly.

`core/cache.ts`'s `AssetManager` owns the actual Spine asset loading (binary `.skel` + `.atlas`) through Tauri's custom asset protocol (`ASSET_PROTOCOL` in `constants.ts`), and no-ops if the requested skel/atlas pair is already loaded — this dedup matters for bond-view cycling, which reuses `AssetManager` across bond entries.

### Bond animation sequencing

This is the most intricate piece of frontend logic and spans three files that only make sense together:

- `core/animate.ts` (`Animate`) — parses a skeleton's raw Spine animation name list into ordered stage **groups** using a naming convention (`<prefix><stage><part>_<mode>[_suffix]`, e.g. `20_loop_1`) baked into `parseName`/`parseAnimationMode`. Group boundaries are decided per animation "mode" (`idle`, `loop`, `finish`, `end`, `bg`, `skip`) with hand-tuned adjacency rules (e.g. consecutive same-family loops cycle as alternates rather than starting a new group; `90_BG` is pulled into a separate background channel; anything at stage ≥8 other than `90_BG` is dropped). `animate.test.ts` is the executable spec for these rules — when touching `groupAnimations`/`parseName`, read/extend the tests there rather than reasoning from source alone, since the grouping rules were built up from real per-hero regressions (see the "real-world regression cases" describe block).
- `core/bondSequencer.ts` (`BondSequencer`) — the actual auto-play state machine built on top of `Animate`'s groups: which stage is active, what queued sequence (`stop` animation + `bypass` footage) should play, and whether manual checkbox selection (`manualOverride`) has taken control from auto-advance. `groups[stageIndex][0]` is always the resting/stop animation for that stage; everything after index 0 is bypass footage played while leaving the stage.
- `core/bondRules.ts` (`getBondRule`) — per-hero-ID overrides (`disable`, `skip`, `rename`) for heroes whose bond skeletons don't follow the naming convention cleanly enough for `Animate` to parse correctly. **This is the frontend equivalent of `rules.rs`** — when a specific hero's bond animation cycles wrong, this is usually the first place to add an exception, not `animate.ts` itself.

`ModelState.getAnimation` is where these three connect back into the render loop: for bond view it lazily builds an `Animate` from the current skeleton + bond rule, seeds/advances the `BondSequencer`, and returns either the sequencer's current sequence or (if `rule.disable` or manual override is active) a flat manual animation list built from checkbox state (`this.animations`).

## Clean code policy

- Keep files small: aim for **≤120 lines**. Split a file when it grows past this rather than letting it accrete.
- Avoid deep nesting: **<3 levels of indentation** in logic-bearing code (`.ts`/`.rs` control flow). Markup (`.svelte`/`.html`) is more lenient since structural nesting there isn't logic nesting — extract a sub-component or early-return instead of nesting further.
- Use descriptive, consistent names for functions, variables, files, and test cases — a name should make a comment unnecessary.
- **No comments**, unless ***absolutely*** necessary: a short "why" comment (not "what") when something can't be made self-evident through naming/structure alone — e.g. a non-obvious workaround, an external constraint, a hidden invariant. Keep these **under 40 characters**.

## Conventions worth knowing

- Frontend uses tabs for indentation (see any file under `src/lib`).
- UI primitives under `src/lib/components/ui/*` are shadcn-svelte components (see `components.json`) — treat them as generated/vendored; put app-specific logic in `src/lib/components/*.svelte` instead of editing the primitives unless you're intentionally updating the design system.
- Hero/bond/collection identifiers throughout both backend and frontend are the game's raw string IDs (`H003`, `A0150`, `CG/...`, etc.) — don't assume they're numeric or database-generated.
- `TODO.md` documents live known bugs (e.g. `TwoColorTint` blend mode rendering, partial animation playback on some heroes) and design notes on the bond system — check it before assuming an oddity is a regression you introduced.
