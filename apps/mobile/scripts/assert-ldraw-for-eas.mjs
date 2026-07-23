#!/usr/bin/env node
/**
 * Fail fast on EAS if the LDraw subset is missing from the clone.
 * EAS does not run ldraw:subset (needs a full library). The subset under
 * apps/mobile/assets/ldraw must be committed so withLdrawAssets can copy it.
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

if (!hasOfficial && !hasLegacy) {
  console.error(`LDraw subset missing at ${ldrawRoot}.

EAS builds clone git only — commit apps/mobile/assets/ldraw (subset), then rebuild.
Generate locally with:
  yarn workspace @scratch-mobile/mobile ldraw:subset
  git add apps/mobile/assets/ldraw
`);
  process.exit(1);
}

console.log(`LDraw subset present at ${ldrawRoot}`);
