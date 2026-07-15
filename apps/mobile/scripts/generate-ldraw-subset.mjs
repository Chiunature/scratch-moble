#!/usr/bin/env node
/**
 * Generate a minimal LDraw library under apps/mobile/assets/ldraw from the
 * dependency closure of built-in Build Guide MPD models.
 *
 * Source (full library):
 *   LDRAW_LIBRARY_ROOT env, or apps/mobile/assets/ldraw when it already holds
 *   a full parts/ + p/ tree.
 *
 * After generating the subset, run: yarn workspace @scratch-mobile/mobile ldraw:sync
 *
 * When adding a new built-in MPD, register it in BUILTIN_MPDS below and re-run
 *   yarn workspace @scratch-mobile/mobile ldraw:subset
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const assetsRoot = path.join(mobileRoot, 'assets');
const defaultDestRoot = path.join(assetsRoot, 'ldraw');

const BUILTIN_MPDS = [
  path.join(assetsRoot, 'buildGuide/models/container-demo/build/export.mpd'),
  path.join(assetsRoot, 'buildGuide/models/tesla-model-s/build/export.mpd'),
];

const ESSENTIAL_ROOT_FILES = [
  'LDConfig.ldr',
  'LDCfgalt.ldr',
  'LDCfgal2.ldr',
];

/** Mirrors packages/ldr-engine/src/loader/localPartPaths.ts */
function buildLocalPartCandidates(id, roots) {
  const normalized = id.replace(/\\/g, '/');
  const lower = normalized.toLowerCase();

  const relativePaths =
    lower.endsWith('.dat') || lower.endsWith('.ldr')
      ? [
          `parts/${lower}`,
          `p/${lower}`,
          `ldraw_parts/${lower}`,
          `ldraw_unofficial/${lower}`,
          lower,
        ]
      : [lower];

  const candidates = [];
  for (const root of roots) {
    const base = root.endsWith('/') ? root.slice(0, -1) : root;
    for (const relative of relativePaths) {
      candidates.push({
        absolute: `${base}/${relative}`,
        relative,
      });
    }
  }
  return candidates;
}

function resolvePartFile(id, libraryRoot) {
  for (const candidate of buildLocalPartCandidates(id, [libraryRoot])) {
    if (existsSync(candidate.absolute)) {
      return candidate;
    }
  }
  return null;
}

function extractEmbeddedFileIds(text) {
  const ids = new Set();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*0\s+FILE\s+(.+?)\s*$/i);
    if (match) {
      ids.add(match[1].trim().toLowerCase());
    }
  }
  return ids;
}

function extractType1References(text) {
  const refs = new Set();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('1 ')) {
      continue;
    }
    // 1 colour x y z a b c d e f g h i FILE
    const parts = trimmed.split(/\s+/);
    if (parts.length < 15) {
      continue;
    }
    const fileId = parts.slice(14).join(' ').trim();
    if (fileId) {
      refs.add(fileId);
    }
  }
  return refs;
}

function collectClosure(mpdPaths, libraryRoot) {
  const needed = new Map(); // relative -> absolute
  const queued = [];
  const seen = new Set();
  const unresolved = new Set();
  const embedded = new Set();

  for (const mpdPath of mpdPaths) {
    if (!existsSync(mpdPath)) {
      throw new Error(`Missing built-in MPD: ${mpdPath}`);
    }
    const text = readFileSync(mpdPath, 'utf8');
    for (const id of extractEmbeddedFileIds(text)) {
      embedded.add(id);
    }
    for (const ref of extractType1References(text)) {
      queued.push(ref);
    }
  }

  while (queued.length > 0) {
    const id = queued.pop();
    const key = id.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    if (embedded.has(key)) {
      continue;
    }

    const resolved = resolvePartFile(id, libraryRoot);
    if (!resolved) {
      unresolved.add(id);
      continue;
    }

    needed.set(resolved.relative, resolved.absolute);
    const partText = readFileSync(resolved.absolute, 'utf8');
    for (const nestedId of extractEmbeddedFileIds(partText)) {
      embedded.add(nestedId);
    }
    for (const ref of extractType1References(partText)) {
      queued.push(ref);
    }
  }

  return { needed, unresolved };
}

function hasOfficialLayout(root) {
  return existsSync(path.join(root, 'parts')) || existsSync(path.join(root, 'p'));
}

function countFiles(root) {
  if (!existsSync(root)) {
    return 0;
  }
  let count = 0;
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        count += 1;
      }
    }
  };
  walk(root);
  return count;
}

function resolveLibrarySource() {
  const fromEnv = process.env.LDRAW_LIBRARY_ROOT;
  if (fromEnv) {
    const resolved = path.resolve(fromEnv);
    if (!hasOfficialLayout(resolved)) {
      throw new Error(
        `LDRAW_LIBRARY_ROOT=${resolved} does not contain parts/ or p/`,
      );
    }
    return resolved;
  }

  if (hasOfficialLayout(defaultDestRoot)) {
    return defaultDestRoot;
  }

  throw new Error(`Full LDraw library not found.

Set LDRAW_LIBRARY_ROOT to a complete official LDraw tree, or place one at:
  apps/mobile/assets/ldraw/parts/
  apps/mobile/assets/ldraw/p/

Then run:
  yarn workspace @scratch-mobile/mobile ldraw:subset
`);
}

function copyEssentials(sourceRoot, destRoot) {
  for (const fileName of ESSENTIAL_ROOT_FILES) {
    const source = path.join(sourceRoot, fileName);
    if (existsSync(source)) {
      cpSync(source, path.join(destRoot, fileName));
    }
  }
}

function writeSubset(sourceRoot, destRoot, needed) {
  const staging = mkdtempSync(path.join(os.tmpdir(), 'ldraw-subset-'));
  try {
    mkdirSync(staging, { recursive: true });
    copyEssentials(sourceRoot, staging);

    for (const [relative, absolute] of needed) {
      const target = path.join(staging, relative);
      mkdirSync(path.dirname(target), { recursive: true });
      cpSync(absolute, target);
    }

    if (existsSync(destRoot)) {
      rmSync(destRoot, { recursive: true, force: true });
    }
    mkdirSync(path.dirname(destRoot), { recursive: true });
    cpSync(staging, destRoot, { recursive: true });
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

function totalBytes(root) {
  let bytes = 0;
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        bytes += statSync(full).size;
      }
    }
  };
  walk(root);
  return bytes;
}

const sourceRoot = resolveLibrarySource();
const { needed, unresolved } = collectClosure(BUILTIN_MPDS, sourceRoot);

writeSubset(sourceRoot, defaultDestRoot, needed);

const fileCount = countFiles(defaultDestRoot);
const byteCount = totalBytes(defaultDestRoot);
const manifest = {
  generatedAt: new Date().toISOString(),
  sourceRoot,
  mpdCount: BUILTIN_MPDS.length,
  fileCount,
  byteCount,
  unresolvedExternal: [...unresolved].sort(),
};
writeFileSync(
  path.join(defaultDestRoot, 'subset-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log(`LDraw subset written to ${defaultDestRoot}`);
console.log(`  files: ${fileCount}`);
console.log(`  size:  ${byteCount} bytes (~${(byteCount / (1024 * 1024)).toFixed(2)} MiB)`);
if (unresolved.size > 0) {
  console.warn(
    `  unresolved external refs (${unresolved.size}) — usually Generator/procedural parts:`,
  );
  for (const id of [...unresolved].sort().slice(0, 20)) {
    console.warn(`    - ${id}`);
  }
  if (unresolved.size > 20) {
    console.warn(`    … and ${unresolved.size - 20} more`);
  }
}
console.log('Next: yarn workspace @scratch-mobile/mobile ldraw:sync');
