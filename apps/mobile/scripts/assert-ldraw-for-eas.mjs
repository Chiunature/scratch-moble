#!/usr/bin/env node
/**
 * Fail fast on EAS if the LDraw subset is missing from the clone.
 * EAS does not run ldraw:subset (needs a full library). The subset under
 * apps/mobile/assets/ldraw must be committed; eas-build-post-install then
 * runs ldraw:sync into android/ios (config plugins are skipped when those
 * native folders are already in the repo).
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ldrawRoot = path.resolve(__dirname, '../assets/ldraw');
const hasOfficial =
  existsSync(path.join(ldrawRoot, 'parts')) ||
  existsSync(path.join(ldrawRoot, 'p'));
const hasLegacy =
  existsSync(path.join(ldrawRoot, 'ldraw_parts')) ||
  existsSync(path.join(ldrawRoot, 'ldraw_unofficial'));

const ldrawIndexPath = path.join(ldrawRoot, 'part-index.json');

if (!hasOfficial && !hasLegacy) {
  console.error(`LDraw subset missing at ${ldrawRoot}.

EAS builds clone git only — commit apps/mobile/assets/ldraw (subset), then rebuild.
Generate locally with:
  yarn workspace @scratch-mobile/mobile ldraw:subset
  git add apps/mobile/assets/ldraw

Note: with android/ios already in the repo, EAS skips config plugins.
eas-build-post-install must run ldraw:sync after this assert.
`);
  process.exit(1);
}

if (!existsSync(ldrawIndexPath)) {
  console.error(`LDraw part index missing at ${ldrawIndexPath}.

Regenerate the committed subset with:
  yarn workspace @scratch-mobile/mobile ldraw:subset
  git add apps/mobile/assets/ldraw
`);
  process.exit(1);
}

console.log(`LDraw subset present at ${ldrawRoot}`);
