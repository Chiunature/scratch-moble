# Build Guide

Runtime **MPD** manifests drive the mobile build guide. Each bundle contains:

- `manifest.json` — `MpdManifest` (mpd URI, parts base URL, optional step overrides)
- `.build/export.mpd` (or similar) — the LDraw model with `0 STEP` markers

## Mobile bundle example

`apps/mobile/assets/buildGuide/container-demo/`

## Engine

LDraw parsing, step handling, and parts counting live in `@scratch-mobile/ldr-engine`
(buildinginstructions.js algorithms, Three.js BufferGeometry path).
