# @scratch-mobile/build-guide

Build-time tools and shared types for LEGO build guide bundles.

## Bake commands

From repo root:

```bash
yarn build-guide:bake duck-demo
```

Outputs to `apps/mobile/assets/buildGuide/duck-demo/`:

- `manifest.json` — step metadata (titles, parts, camera, glb paths)
- `step-001.glb` … `step-003.glb` — per-step glTF assets

### Custom source manifest

```bash
yarn workspace @scratch-mobile/build-guide bake from-source \
  --source fixtures/duck-demo.source.json \
  --out /tmp/my-bundle
```

### Parse an LDraw `.mpd` (metadata only)

```bash
yarn build-guide:bake mpd --mpd /path/to/model.mpd --max-steps 3 --out ./output
```

This writes `manifest.json` from `0 STEP` markers. glTF export still requires
[buildinginstructions.js](https://github.com/LasseD/buildinginstructions.js) —
see the generated `BAKE_PENDING.md`.

## Files you may need to provide later

| File | Purpose |
|------|---------|
| `.mpd` / `.ldr` with `0 STEP` | Stepped LDraw model |
| LDraw parts library | Required for real mesh export |
| buildinginstructions.js checkout | Browser-based LDraw → glTF export |

For the current spike, **no external files are required** — use `duck-demo`.
