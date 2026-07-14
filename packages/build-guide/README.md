# Build Guide

Runtime **MPD** manifests drive the mobile build guide. Each bundle contains:

- `manifest.json` — `MpdManifest` (mpd URI, parts base URL, optional step overrides)
- `build/export.mpd` (or similar) — the LDraw model with `0 STEP` markers

## Mobile bundle example

`apps/mobile/assets/buildGuide/container-demo/`

## LDraw parts subset

Do **not** ship the full LDraw catalog in the app. After placing a complete library
at `LDRAW_LIBRARY_ROOT` (or temporarily under `apps/mobile/assets/ldraw`):

```bash
yarn workspace @scratch-mobile/mobile ldraw:subset
yarn workspace @scratch-mobile/mobile ldraw:sync
```

`ldraw:subset` keeps only parts referenced by built-in `build/export.mpd` models.
When adding a new built-in model, register its MPD in
`apps/mobile/scripts/generate-ldraw-subset.mjs` and re-run both commands.

## Engine

LDraw parsing, step handling, and parts counting live in `@scratch-mobile/ldr-engine`
(buildinginstructions.js algorithms, Three.js BufferGeometry path).
