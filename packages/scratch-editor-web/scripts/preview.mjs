import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');
const htmlPath = path.join(packageRoot, 'dist', 'index.html');
const port = Number(process.env.PORT || 4173);

const server = createServer(async (req, res) => {
  const url = req.url || '/';
  if (url !== '/' && url !== '/index.html') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  try {
    const html = await readFile(htmlPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      `dist/index.html 不存在，请先执行构建。\n` +
        `命令：yarn workspace @scratch-mobile/scratch-editor-web build\n` +
        `错误：${String(error)}`
    );
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`scratch-editor-web preview: http://127.0.0.1:${port}`);
});
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');
const htmlPath = path.join(packageRoot, 'dist', 'index.html');
const port = Number(process.env.PORT || 4173);

const server = createServer(async (req, res) => {
  const url = req.url || '/';
  if (url !== '/' && url !== '/index.html') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  try {
    const html = await readFile(htmlPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      `dist/index.html 不存在，请先执行构建。\n` +
        `命令：yarn workspace @scratch-mobile/scratch-editor-web build\n` +
        `错误：${String(error)}`
    );
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`scratch-editor-web preview: http://127.0.0.1:${port}`);
});
