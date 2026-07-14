import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');

const distHtmlPath = path.join(packageRoot, 'dist', 'index.html');
const outputDir = path.join(repoRoot, 'apps', 'mobile', 'assets', 'editor');
const outputFile = path.join(outputDir, 'editorBundle.html');

const html = await readFile(distHtmlPath, 'utf8');

await mkdir(outputDir, { recursive: true });
await writeFile(outputFile, html, 'utf8');

console.log(
  'editor bundle synced to apps/mobile/assets/editor/editorBundle.html',
);
