#!/usr/bin/env node
/**
 * BuildGuide bake CLI — Phase 2 spike
 *
 * Recipes:
 *   duck-demo   Bake the bundled Duck fixture (no external files needed)
 *   from-source Bake from a JSON source manifest + glTF model
 *   mpd         Parse an .mpd for STEP metadata (glb export needs buildinginstructions.js)
 *
 * Usage:
 *   node scripts/bake.mjs duck-demo
 *   node scripts/bake.mjs from-source --source fixtures/duck-demo.source.json
 *   node scripts/bake.mjs mpd --mpd /path/to/model.mpd --out ./output
 */
import { NodeIO } from '@gltf-transform/core';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '../..');
const defaultMobileBundleDir = path.join(
  repoRoot,
  'apps/mobile/assets/buildGuide/duck-demo',
);

function usage() {
  console.log(`BuildGuide bake

Commands:
  duck-demo [--out <dir>]
  from-source --source <json> [--out <dir>]
  mpd --mpd <file.mpd> [--out <dir>] [--max-steps <n>]

Examples:
  node scripts/bake.mjs duck-demo
  node scripts/bake.mjs from-source --source fixtures/duck-demo.source.json
  node scripts/bake.mjs mpd --mpd ~/models/container.mpd --max-steps 3
`);
}

function parseArgs(argv) {
  const args = [...argv];
  const command = args.shift();
  const flags = {};
  const positional = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i += 1;
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, flags, positional };
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function resolveRepoPath(relativePath) {
  return path.resolve(packageRoot, relativePath);
}

async function writeScaledGlb(sourcePath, destPath, scale) {
  if (scale === undefined || scale === 1) {
    copyFileSync(sourcePath, destPath);
    return;
  }

  const io = new NodeIO();
  const document = await io.read(sourcePath);
  const scenes = document.getRoot().listScenes();

  for (const scene of scenes) {
    for (const node of scene.listChildren()) {
      const current = node.getScale();
      node.setScale([current[0] * scale, current[1] * scale, current[2] * scale]);
    }
  }

  await io.write(destPath, document);
}

function buildBakedManifest(source) {
  return {
    version: 1,
    id: source.id,
    nameKey: source.nameKey,
    steps: source.steps.map((step, index) => ({
      id: step.id,
      index,
      titleKey: step.titleKey,
      descriptionKey: step.descriptionKey,
      glb: step.glb,
      parts: step.parts,
      newPartIds: step.newPartIds,
      displayScale: step.scale ?? 1,
      camera: step.camera,
    })),
  };
}

async function bakeFromSource(sourcePath, outDir) {
  const source = readJson(sourcePath);
  const modelPath = resolveRepoPath(source.sourceModel);

  if (!existsSync(modelPath)) {
    throw new Error(`source model not found: ${modelPath}`);
  }

  mkdirSync(outDir, { recursive: true });

  for (const step of source.steps) {
    const destPath = path.join(outDir, step.glb);
    await writeScaledGlb(modelPath, destPath, step.scale ?? 1);
    console.log(`  wrote ${path.relative(repoRoot, destPath)} (scale=${step.scale ?? 1})`);
  }

  const manifest = buildBakedManifest(source);
  const manifestPath = path.join(outDir, 'manifest.json');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`  wrote ${path.relative(repoRoot, manifestPath)} (${manifest.steps.length} steps)`);
}

function parseMpdSteps(mpdContent, maxSteps) {
  const segments = mpdContent.split(/^0 STEP\s*$/m);
  const steps = [];

  for (let i = 1; i < segments.length; i += 1) {
    if (maxSteps !== undefined && steps.length >= maxSteps) {
      break;
    }

    const segment = segments[i];
    const parts = [];
    const partIds = new Set();

    for (const line of segment.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('1 ')) {
        continue;
      }

      const tokens = trimmed.split(/\s+/);
      const partFile = tokens[tokens.length - 1];
      if (!partFile || !partFile.endsWith('.dat')) {
        continue;
      }

      const partId = partFile.replace(/\.dat$/i, '');
      if (!partIds.has(partId)) {
        partIds.add(partId);
        parts.push({
          id: partId,
          nameKey: `parts.${partId}`,
        });
      }
    }

    const stepNumber = steps.length + 1;
    steps.push({
      id: `step-${stepNumber}`,
      index: steps.length,
      titleKey: `steps.${stepNumber}.title`,
      descriptionKey: `steps.${stepNumber}.description`,
      glb: `step-${String(stepNumber).padStart(3, '0')}.glb`,
      parts,
      newPartIds: parts.map(part => part.id),
    });
  }

  return steps;
}

async function bakeMpd(mpdPath, outDir, maxSteps) {
  if (!existsSync(mpdPath)) {
    throw new Error(`mpd file not found: ${mpdPath}`);
  }

  const mpdContent = readFileSync(mpdPath, 'utf8');
  const modelId = path.basename(mpdPath, path.extname(mpdPath));
  const steps = parseMpdSteps(mpdContent, maxSteps);

  if (steps.length === 0) {
    throw new Error('no 0 STEP markers found in mpd — is this a stepped model?');
  }

  mkdirSync(outDir, { recursive: true });

  const manifest = {
    version: 1,
    id: modelId,
    nameKey: `models.${modelId}.name`,
    steps,
  };

  const manifestPath = path.join(outDir, 'manifest.json');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const readmePath = path.join(outDir, 'BAKE_PENDING.md');
  writeFileSync(
    readmePath,
    `# Pending glTF export for ${modelId}

Parsed ${steps.length} step(s) from \`${path.basename(mpdPath)}\`.

## Next step (needs buildinginstructions.js)

1. Clone https://github.com/LasseD/buildinginstructions.js
2. Install the LDraw parts library on your machine
3. Export each step to \`step-NNN.glb\` using a headless browser script
4. Re-run \`yarn build-guide:bake mpd --mpd ...\` or copy glbs into this folder

Until glbs exist, the mobile app can load manifest metadata only.
`,
    'utf8',
  );

  console.log(`  wrote ${path.relative(repoRoot, manifestPath)} (${steps.length} steps, metadata only)`);
  console.log(`  wrote ${path.relative(repoRoot, readmePath)}`);
  console.log('');
  console.log('  glb files were NOT generated — provide buildinginstructions.js setup to export meshes.');
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));

  if (!command || command === 'help' || command === '--help') {
    usage();
    return;
  }

  const outDir = flags.out
    ? path.resolve(process.cwd(), flags.out)
    : defaultMobileBundleDir;

  console.log(`BuildGuide bake: ${command}`);
  console.log(`  output → ${path.relative(repoRoot, outDir)}`);
  console.log('');

  switch (command) {
    case 'duck-demo':
      await bakeFromSource(
        path.join(packageRoot, 'fixtures/duck-demo.source.json'),
        outDir,
      );
      break;

    case 'from-source': {
      const source = flags.source;
      if (typeof source !== 'string') {
        throw new Error('from-source requires --source <json>');
      }
      await bakeFromSource(path.resolve(process.cwd(), source), outDir);
      break;
    }

    case 'mpd': {
      const mpd = flags.mpd;
      if (typeof mpd !== 'string') {
        throw new Error('mpd requires --mpd <file.mpd>');
      }
      const maxSteps =
        flags['max-steps'] !== undefined ? Number(flags['max-steps']) : undefined;
      await bakeMpd(path.resolve(mpd), outDir, maxSteps);
      break;
    }

    default:
      usage();
      process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
