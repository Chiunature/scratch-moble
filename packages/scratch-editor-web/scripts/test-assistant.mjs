// Run after `yarn editor:web:build`. Uses a real Chrome workspace, not mocks.
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = mkdtempSync(path.join(tmpdir(), 'assistant-browser-'));
const chrome =
  process.env.CHROME_BIN ??
  (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : 'chromium');
const harness = () => {
  const messages = [];
  window.ReactNativeWebView = {
    postMessage: raw => messages.push(JSON.parse(raw)),
  };
  const check = (condition, label) => {
    if (!condition) throw new Error(label);
  };
  let seq = 0;
  const send = (type, values = {}) => {
    const requestId = `test-${++seq}`;
    window.__scratchEditorReceiveFromNative({
      type,
      projectId: 'browser-test',
      requestId,
      ...values,
    });
    return messages.find(m => m.requestId === requestId);
  };
  const snapshot = () => send('editor.workspace.snapshot.request');
  const prepare = (snap, operations, intent = 'modify') =>
    send('editor.workspace.candidate.prepare', {
      sessionId: snap.sessionId,
      baseWorkspaceHash: snap.workspaceHash,
      catalogVersion: snap.catalogVersion,
      proposal: { schemaVersion: 1, intent, summary: '集成测试', operations },
    });
  const apply = ready =>
    send('editor.workspace.candidate.apply', {
      sessionId: ready.sessionId,
      candidateId: ready.candidateId,
    });
  const result = document.createElement('pre');
  result.id = 'assistant-test-result';
  document.body.appendChild(result);
  const timer = setInterval(() => {
    if (!window.__scratchEditorReceiveFromNative) return;
    clearInterval(timer);
    try {
      send('editor.workspace.load', { workspace: null, revision: 1 });
      const before = snapshot();
      check(before.type === 'editor.workspace.snapshot', 'snapshot failed');
      const statements = [
        { kind: 'motor.runPower', port: 4, power: 50 },
        { kind: 'motor.runForPowerSeconds', port: 5, power: -20, seconds: 2 },
        { kind: 'motor.stop', port: 6 },
        { kind: 'motor.stopModule', port: 7, mode: 'brake' },
        { kind: 'move.directionPower', direction: 'advance', power: 40 },
        {
          kind: 'move.directionPowerSeconds',
          direction: 'retreat',
          power: 30,
          seconds: 1.5,
        },
        { kind: 'move.differentialPower', leftPower: 50, rightPower: 30 },
        {
          kind: 'move.differentialPowerSeconds',
          leftPower: 40,
          rightPower: -40,
          seconds: 3,
        },
        { kind: 'move.stop' },
        { kind: 'control.sleep', seconds: 1 },
        { kind: 'sound.playMusic', note: 36, duration: 0.25 },
      ];
      let ready = prepare(
        before,
        [{ kind: 'replaceMainScript', statements }],
        'create',
      );
      check(
        ready.type === 'editor.workspace.candidate.ready',
        `real headless load: ${ready.reason}`,
      );
      check(
        ready.code.includes('50') && ready.code.length > before.code.length,
        'real Python generator',
      );
      // Snapshot observes the original and intentionally invalidates the candidate.
      const unchanged = snapshot();
      check(
        unchanged.workspaceHash === before.workspaceHash,
        'prepare modified original',
      );
      ready = prepare(
        unchanged,
        [{ kind: 'replaceMainScript', statements }],
        'create',
      );
      check(
        apply(ready).type === 'editor.workspace.candidate.applied',
        'real rendered application',
      );
      check(
        apply(ready).type === 'editor.workspace.candidate.rejected',
        'duplicate application',
      );
      let after = snapshot();
      check(
        after.blocks.filter(b => b.role === 'statement').length === 11,
        'all 11 statement types loaded',
      );
      const motor = after.blocks.find(
        b => b.statement?.kind === 'motor.runPower',
      );
      const changed = prepare(after, [
        { kind: 'updateStatement', blockId: motor.id, patch: { power: 80 } },
      ]);
      check(
        changed.type === 'editor.workspace.candidate.ready',
        `modify failed: ${changed.reason}`,
      );
      check(
        apply(changed).type === 'editor.workspace.candidate.applied',
        'parameter modification',
      );
      const restored = send('editor.workspace.candidate.restore', {
        sessionId: after.sessionId,
      });
      check(
        restored.type === 'editor.workspace.candidate.applied',
        `restore: ${restored.reason}`,
      );
      after = snapshot();
      check(
        after.blocks.find(b => b.id === motor.id).statement.power === 50,
        'restored literal',
      );
      const invalid = prepare(after, [
        {
          kind: 'appendToMainScript',
          statements: [{ kind: 'motor.runPower', port: 99, power: 10 }],
        },
      ]);
      check(
        invalid.type === 'editor.workspace.candidate.rejected',
        'invalid port accepted',
      );
      check(
        snapshot().workspaceHash === after.workspaceHash,
        'invalid proposal changed original',
      );
      result.textContent =
        'PASS: real Scratch workspace, 11 kinds, Python generation, isolation, apply, duplicate rejection, parameter update, restore, invalid input';
    } catch (error) {
      result.textContent = `FAIL: ${error.message}`;
    }
  }, 100);
};
try {
  let html = readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  html = html.replace(
    '<script>',
    `<script>(${harness.toString()})();</script><script>`,
  );
  const filename = path.join(temp, 'test.html');
  writeFileSync(filename, html);
  const run = spawnSync(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--user-data-dir=${path.join(temp, 'profile')}`,
      '--allow-file-access-from-files',
      '--dump-dom',
      '--virtual-time-budget=15000',
      pathToFileURL(filename).href,
    ],
    { encoding: 'utf8', timeout: 45000, maxBuffer: 32 * 1024 * 1024 },
  );
  const result = run.stdout?.match(
    /<pre id="assistant-test-result">([^<]*)<\/pre>/,
  )?.[1];
  console.log(
    result ||
      `FAIL: browser did not finish (${
        run.error?.message ?? run.signal ?? run.status
      })`,
  );
  if (!result?.startsWith('PASS:')) {
    console.error(run.stderr?.slice(-4000));
    process.exitCode = 1;
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
