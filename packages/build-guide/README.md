# Build Guide

Runtime **MPD** manifests drive the mobile build guide.

```
apps/mobile/assets/buildGuide/
  catalog.json                 # picker list (id, nameKey, optional cover)
  models/
    <model-id>/
      manifest.json            # MpdManifest (mpd URI, mainModelId, cameras…)
      build/export.mpd
      cover.png                # optional picker cover (any local image name; register in bundles.ts)
```

## Flow

1. Home → **Build Guide** opens the model picker (`catalog.json`)
2. Selecting a model opens the player with that model's `manifest.json` + MPD

## Adding a model

1. Add `assets/buildGuide/models/<id>/manifest.json` + `build/export.mpd`
2. Register a static `require` in `apps/mobile/src/features/buildGuide/data/bundles.ts`
3. Append an entry to `catalog.json`
4. Add i18n `nameKey` strings under `packages/i18n/.../buildGuide.json`
5. Register the MPD in `apps/mobile/scripts/generate-ldraw-subset.mjs` and run:

```bash
yarn workspace @scratch-mobile/mobile ldraw:subset
yarn workspace @scratch-mobile/mobile ldraw:sync
```

`ldraw:subset` keeps only parts referenced by built-in `build/export.mpd` models.
Do **not** ship the full LDraw catalog in the app.

## Engine

LDraw parsing, step handling, and parts counting live in `@scratch-mobile/ldr-engine`
(buildinginstructions.js algorithms, Three.js BufferGeometry path).
