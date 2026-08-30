# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ark Re:Code Gallery ("Gallery") is a Tauri 2 desktop app for viewing Spine skeletal models extracted from the gacha game *Ark Re:Code*. It is "bring-your-own-files": at first launch the user points it at a data folder containing an `assets.xml` manifest and a `containers` directory of extracted game files (Sprite/TextAsset/Texture2D dumps, typically produced by AssetStudio). See `GUIDE.md` for the exact expected folder layout and `TODO.md` for known bugs / in-progress design notes on bond animation sequencing.

The app has two halves that only talk to each other through one Tauri command and one generated JSON file:

- **Rust backend** (`src-tauri/src`): a one-shot data pipeline that scans the user's data folder and emits `gallery-data/map.json`.
- **Svelte 5 frontend** (`src`): reads `map.json`, drives an Esoteric Software Spine WebGL canvas, and renders the browsing UI (data table of heroes, a Spine viewer, keyboard-driven navigation).

There is no persistent backend process and no live backend↔frontend messaging beyond that single `invoke("generate_map", ...)` call — everything after that is the frontend reading static JSON plus streaming binary assets from disk (see "Dual build targets" below — this asset-streaming path differs between the Tauri desktop build and the static hosted build).

## Commands

Frontend (run from repo root):

```
npm run dev            # vite dev server, Tauri target (also what Tauri's beforeDevCommand runs)
npm run build           # vite build, Tauri target (svelte-kit adapter-static)
npm run dev:static      # vite dev server, static target ($platform → platform/static.ts)
npm run build:static    # vite build, static target — run scripts/prepare-static-data.test.ts first
npm run check           # svelte-kit sync + svelte-check (type checking); run once per BUILD_TARGET to check both
npm run test             # vitest run (single run, not watch)
npx vitest run tests/lib/core/animate.test.ts   # run a single test file
npx vitest run -t "test name substring"        # run tests matching a name
npx vitest run --config scripts/vitest.scripts.config.ts scripts/prepare-static-data.test.ts
                        # regenerates static/gallery-data/ from TEST_GALLERY_DIR; run before build:static
npx vitest run --config scripts/vitest.scripts.config.ts scripts/validate-bond-rules.test.ts
                        # re-runs Animate+bondRules over an exported animations.json and diffs recorded groups;
                        # fast regression net for editing bondRules.ts. SKEL_ID env filters to one skeleton.
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

Don't reach for Playwright (or any headless-browser/screenshot automation) to verify frontend changes — the app's first load streams the full asset set and takes minutes, so screenshot-based checks are too slow to be a useful feedback loop and tend to time out or capture a still-loading page. Verify with `npm run check` + `npx vitest run` instead; if a change genuinely needs visual confirmation, ask the user to check it in their own running dev server rather than automating a browser.

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
- `modelState.svelte.ts` — the `ModelState`: a thin composition root with no logic of its own, wiring together one leaf state class per concern (each in its own file under `hooks/`) plus a few classes that act on them:
  - Leaf state: `HeroSelection` (which hero/view/skin-cycle index is selected), `SkinState` (skin level + name resolution), `HeroViewState` (hero/alt-view animation cycling + checkbox state, exposed as the `heroAnimation` property), `SkillViewState` (skill-view touch/cutscene/checkbox state), `BondViewState` (wraps a `BondSequencer` plus UI-facing progress/stage state, exposed as `bond`), `CheckboxAnimationState` (view-agnostic multi-select checkbox track bookkeeping, exposed as `checkboxAnimations`), `UpdateFlags` (the skin/animation/model dirty flags, via `request*`/`has*` pairs).
  - Acting on that state: `BondSequenceActions` (imperative bond actions — advance stage, manual control, checkbox select, `getAnimation`), `BondAutoPlay` (auto-advances a stage once its animation completes), `ModelNavigation` (hero/view switching, including its own keybind switch statement), `ModelFrameSync` (the render-loop-facing surface `app.ts` calls each frame: dispatches `getAnimation` by view, reconciles checkboxes, updates playback progress), `ModelInputHandler` (keydown handling for skin/animation-cycle keys and checkbox toggles — **this is where `addKeydownListener` from `core/keybinds.svelte.ts` is actually registered**, not in `ModelState`'s own constructor).

`core/app.ts`'s `App` class implements Spine WebGL's `SpineCanvasApp` and is the render loop: `initialize` → `loadModel`/`configureScene` once, then `update`/`render` every frame. It polls `store.modelState.updateFlags.has*Update()` flags each frame to decide whether to reload the skin, animation track, or whole model — those flags are set via `UpdateFlags.request*Update()` calls from `ModelNavigation`/`ModelInputHandler`/`BondAutoPlay` in response to keybinds or view changes, not pushed directly by `ModelState`.

`core/cache.ts`'s `AssetManager` owns the actual Spine asset loading (binary `.skel` + `.atlas`), and no-ops if the requested skel/atlas pair is already loaded — this dedup matters for bond-view cycling, which reuses `AssetManager` across bond entries. It's constructed with a pre-resolved container base URL (`platform.getContainerBaseUrl()`, see "Dual build targets" below) rather than resolving paths itself, and stays fully synchronous internally — this matters because `core/app.ts`'s `loadAssets`/`reloadModel` lifecycle (driven by spine-webgl's `SpineCanvasApp` contract) calls it without awaiting, so any async path resolution has to happen once up front, not per asset load.

### Bond animation sequencing

This is the most intricate piece of frontend logic and spans a cluster of files that only make sense together:

- `core/animate.ts` (`Animate`) — parses a skeleton's raw Spine animation name list into ordered stage **groups** using a naming convention (`<stage><part>_<mode>[_suffix]`, e.g. `20_loop_1`) baked into `parseName`/`parseAnimationMode`. Group boundaries are decided per animation "mode" (`idle`, `loop`, `finish`, `end`, `bg`, `skip`) with hand-tuned adjacency rules (e.g. consecutive same-family loops cycle as alternates rather than starting a new group; `90_bg` is pulled into a separate background channel; anything at stage ≥8 other than `90_bg` is dropped). `animate.test.ts` is the executable spec for these rules — when touching `groupAnimations`/`parseName`, read/extend the tests there rather than reasoning from source alone, since the grouping rules were built up from real per-hero regressions (see the "real-world regression cases" describe block). Rule summary (see `classify` for the authoritative order):
  - **Parsing** (`parseName`): name is lowercased with spaces→`_`, then split on `_`. `stage`/`part` come from the first two digit *characters* of the first token (`"21"` → stage `2`, part `1`); a separate `prefix` field (`getAnimationPrefix`, `core/animationName.ts`) is the first token read as a whole *number* instead (`"21"` → `21`) — used for the strict initial-idle check below and to filter out ≥90 background/effect clips in `heroAnimations.ts`. `mode` comes from the second token, but is overridden if the full name contains `_hand_`/`_lick_`/`_slap_`/`_kiss_`/`_touch_`/`_emo_` as an infix or suffix (`loop` always wins over a special, though). Anything not literally `idle`/`loop`/`finish`/`end`/`bg` falls through to `finish` (bypass-once) — except `touch`/`emo`, which map to `skip`. `transition` is a separate flag, true if the name contains `_in_`/`_out_`/`_to_`/`_off_`. A `variant` flag (false by default) can be forced true by a `bondRules.ts` override, independently of naming-convention continuation.
  - **Per-mode grouping**, processed in original skeleton order:
    - `skip` → dropped outright, never appears in `groups` or `background`.
    - exact name `90_bg` → pushed to `background` instead of `groups`; anything else at `stage >= 8` is dropped.
    - `variant: true` (forced via rule override) → always cycles onto the current group as an alternate, bypassing the mode-specific rules below.
    - `transition: true` → always bypassed onto the current group, except a transition immediately following another transition is dropped (collapses runs down to the first).
    - `idle` → the *first* idle whose `prefix === 0` (i.e. literally `"00_..."`, not just any `stage === 0` name like `"01_..."`) resets everything seen so far and starts group 0 (so leading junk before the real intro idle can't leak in); a same-family follow-up idle (see "variant continuation" below) cycles as an alternate on the current stop; an idle immediately before a `loop` or a `transition` flushes as its own stop; otherwise it's bypassed.
    - `loop` → a same-family follow-up loop cycles as an alternate; anything else always flushes a new group (loops always start a new stage).
    - `finish` → always bypassed, never itself a stop (plays once on the way to the next stage).
    - `end` → a same-family follow-up end cycles as an alternate; anything else always flushes a new group.
  - **Variant continuation** (`isVariantContinuation`): the current name is either identical to the previous one, or its trailing-digit-incremented form (`nextVariantName`: bump the trailing number, or append `2` if there isn't one) — this is what merges `20_loop_ani`/`20_loop_ani2`/`20_loop_ani3` (or repeated `00_idle_N`) into one cycling stop instead of separate stages.
  - **Display stage mapping** (`stageByName`, consumed by `BondSequencer.resolveStage` for manual picks): within a group, entry 0 is the stop; entries after it are bypass footage leading *into* the next stage, so they're attributed to `stageIndex + 1` for display — unless there is no next group, in which case trailing bypass stays on its own stage.
- `core/bondSequencer.ts` (`BondSequencer`) — the actual auto-play state machine built on top of `Animate`'s groups: which stage is active, what queued sequence (`stop` animation + `bypass` footage) should play, and whether manual checkbox selection (`manualOverride`) has taken control from auto-advance. `groups[stageIndex][0]` is always the resting/stop animation for that stage; everything after index 0 is bypass footage played while leaving the stage.
- `core/bondRules.ts` (`getBondRule`) — per-hero-ID `BondRule` overrides for heroes whose bond skeletons don't follow the naming convention cleanly enough for `Animate` to parse correctly: `skip` (raw names to drop before grouping), `rename` (raw name → alias, classification only), `overrides` (raw name → forced `"stop" | "transition" | "variant" | "bypass"` classification, skipping `parseName` entirely), `reorderBefore` (raw name → raw name it must play immediately before, reordering actual playback, not just classification). **This is the frontend equivalent of `rules.rs`** — when a specific hero's bond animation cycles wrong, this is usually the first place to add an exception, not `animate.ts` itself.
- `core/bondAnimate.ts` (`buildBondAnimate`) — the glue nearly every bond call site actually uses instead of constructing `Animate` directly: looks up the `BondRule` for a skel name and builds the `Animate` from it in one call.

A few adjacent files support this cluster without being bond-specific themselves: `core/bondProgress.ts` (pure progress-bar math, shared with hero/skill view state), `core/animationSheet.ts` (dumps every skel's raw + grouped animation names across the whole map, via the headless `core/skeletonParser.ts` binary reader, for the dev-only export button and `scripts/validate-bond-rules.test.ts`). Hero/alt and skill views have their own separate, much smaller per-skel-name allowlists — `core/heroRules.ts` + `core/heroAnimations.ts`, and `core/skillAnimations.ts` — which are *not* part of the bond pipeline and don't go through `Animate`/`bondRules.ts`.

`hooks/modelFrameSync.ts`'s `getAnimation` is where these connect back into the render loop: for bond view it delegates to `hooks/bondSequenceActions.ts`, which calls `buildBondAnimate` for a newly-active skeleton, seeds/advances the `BondSequencer` via `hooks/bondViewState.svelte.ts`, and returns either the sequencer's current sequence or (if manual checkbox override is active) a flat manual animation list built from checkbox state.

### Dual build targets: Tauri desktop vs static hosted

The frontend builds two ways from one codebase, selected at build time via the `BUILD_TARGET` env var (`tauri`, the default, or `static`) and a `$platform` alias configured in `svelte.config.js`'s `kit.alias`, resolving to either `src/lib/platform/tauri.ts` or `src/lib/platform/static.ts` (shared shape in `src/lib/platform/types.ts`). All call sites that need to know which target they're in go through `platform` from `$platform` — never import `@tauri-apps/*` outside `platform/tauri.ts`, or it'll end up in the static bundle.

- **Tauri target** (`platform/tauri.ts`) — today's bring-your-own-files behavior: reads live from the user's local `gallery-data` folder via Tauri's `asset:` protocol, includes a `setup` object (`Platform.setup`) driving the first-run "point at your folder, click Process Files" flow (`setup.svelte`), which invokes `generate_map` same as always.
- **Static target** (`platform/static.ts`) — no setup flow (`platform.setup` is `undefined`, so `setup.svelte` never renders — see `+page.svelte`), fetches a pre-baked `gallery-data/map.json` + `gallery-data/containers/` shipped alongside the site under `static/`.

The static target's data isn't the full local `containers/` dump — it's tree-shaken by **`scripts/prepare-static-data.test.ts`** (run manually before `build:static`, following the same "dormant script under `scripts/`" convention as `extract-skel-animations.test.ts` — see `scripts/vitest.scripts.config.ts`), because `containers/` is raw AssetStudio output and is typically an order of magnitude bigger than what any `Entry` actually references (measured on real data: 5.8GB/11,579 files down to ~3GB/1,726 files).

**When adding a new container-relative-path field to `Entry`/`BondPresentation`/`Bundle` in `types.ts`, you must also add it to `collectEntryPaths` in `scripts/prepare-static-data.test.ts`** — the Tauri build reads live from disk so it won't notice a missed field, but the static build will silently ship a hero with a missing texture/skel/image. The script also parses referenced `.atlas` files for their texture page filenames (not listed in `map.json` at all — Spine atlas format, first line after each blank line is a page image name) since those need tree-shaking too. `static/gallery-data` is gitignored (see "Big Data" in `.gitignore`, alongside `static/icons`/`static/csv`) — it's regenerated locally before each deploy, never committed.

## Clean code policy

- Keep files small: aim for **≤120 lines**. Split a file when it grows past this rather than letting it accrete.
- Avoid deep nesting: **<3 levels of indentation** in logic-bearing code (`.ts`/`.rs` control flow). Markup (`.svelte`/`.html`) is more lenient since structural nesting there isn't logic nesting — extract a sub-component or early-return instead of nesting further.
- Use descriptive, consistent names for functions, variables, files, and test cases — a name should make a comment unnecessary.
- **No comments**, unless ***absolutely*** necessary: a short "why" comment (not "what") when something can't be made self-evident through naming/structure alone — e.g. a non-obvious workaround, an external constraint, a hidden invariant. Keep these **under 40 characters**.

## Conventions worth knowing

- Frontend uses tabs for indentation (see any file under `src/lib`).
- UI primitives under `src/lib/components/ui/*` are shadcn-svelte components (see `components.json`) — treat them as generated/vendored; put app-specific logic elsewhere instead of editing the primitives unless you're intentionally updating the design system. Everything else under `src/lib/components/` is a feature folder — one `.svelte` file plus its co-located logic/data companion file(s), e.g. `controls/controls.svelte` + `controls/controlsDisplay.ts`, `listing/listing.svelte` + `listing/{listingColumns,listingTableDom,tableFilters}.ts` — alongside a few loose top-level files (`collection.svelte`, `dataTable.svelte`, `key.svelte`, `select.svelte`, `setup.svelte`) that haven't grown a folder yet.
- Hero/bond/collection identifiers throughout both backend and frontend are the game's raw string IDs (`H003`, `A0150`, `CG/...`, etc.) — don't assume they're numeric or database-generated.
- `TODO.md` documents live known bugs (e.g. `TwoColorTint` blend mode rendering, partial animation playback on some heroes) and design notes on the bond system — check it before assuming an oddity is a regression you introduced.
- Frontend unit tests live under top-level `tests/`, mirroring `src/lib`'s folder structure (e.g. `src/lib/core/animate.ts` → `tests/lib/core/animate.test.ts`), not alongside the source files they test. They import the code under test via the `$lib` alias (e.g. `import { Animate } from "$lib/core/animate"`) rather than relative paths, since they no longer sit next to it. `vitest.config.ts`'s `include` points at `tests/**/*.test.ts`. This is separate from `scripts/*.test.ts`, which aren't unit tests of other code but dormant diagnostic/data-prep scripts that use vitest as a runner (see `scripts/vitest.scripts.config.ts`) — those stay in `scripts/`.
