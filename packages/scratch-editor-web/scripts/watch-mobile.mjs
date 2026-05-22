import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const srcDir = path.join(packageRoot, 'src');

const build = () =>
  new Promise((resolve, reject) => {
    const child = spawn('node', ['./scripts/build.mjs'], {
      cwd: packageRoot,
      stdio: 'inherit',
      shell: true,
    });
    child.on('exit', code =>
      code === 0 ? resolve() : reject(new Error(`build exited ${code}`)),
    );
  });

const sync = () =>
  new Promise((resolve, reject) => {
    const child = spawn('node', ['./scripts/sync-to-mobile.mjs'], {
      cwd: packageRoot,
      stdio: 'inherit',
      shell: true,
    });
    child.on('exit', code =>
      code === 0 ? resolve() : reject(new Error(`sync exited ${code}`)),
    );
  });

async function rebuild() {
  try {
    await build();
    await sync();
    console.log('[watch:mobile] bundle synced');
  } catch (error) {
    console.error('[watch:mobile]', error);
  }
}

await rebuild();

const { watch } = await import('node:fs');
watch(srcDir, { recursive: true }, (_event, filename) => {
  if (filename?.endsWith('.ts') || filename?.endsWith('.mjs')) {
    void rebuild();
  }
});

console.log(`[watch:mobile] watching ${srcDir}`);
