// Actual Scratch Blocks serialization and Python generation without browser mocks.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
for (const name of [
  'window',
  'document',
  'DOMParser',
  'XMLSerializer',
  'Node',
  'Element',
  'HTMLElement',
  'SVGElement',
]) {
  globalThis[name] = name === 'window' ? dom.window : dom.window[name];
}
const source = `
import * as ScratchBlocks from 'scratch-blocks';
import { initEditorWebI18n } from '@scratch-mobile/i18n';
import { initScratchLocale } from './src/workspace-custom/initScratchLocale';
import { registerEditorBlocks } from './src/blocks/registerBlocks';
import { patchFieldNumberEditor } from './src/workspace-custom/fields/patchFieldNumberEditor';
import { patchFieldNotePicker } from './src/workspace-custom/fields/patchFieldNotePicker';
import { createAssistantController } from './src/assistant/controller';
import { buildAssistantWorkspaceSnapshot } from './src/assistant/buildWorkspaceSnapshot';
import { summarizeWorkspace } from './src/assistant/candidate';
import assert from 'node:assert/strict';
export async function run() {
  await initEditorWebI18n('zh-CN'); initScratchLocale('zh-cn');
  patchFieldNumberEditor(); patchFieldNotePicker(); registerEditorBlocks();
  const workspace = new ScratchBlocks.Workspace();
  const messages = [];
  const controller = createAssistantController(workspace, { post: m => messages.push(m), getProjectId: () => 'p', onApplied() {} });
  let sequence = 0;
  const send = (type, args = {}) => { controller.handleInbound({ type, projectId: 'p', requestId: 'test-' + ++sequence, ...args }); return messages.at(-1); };
  const snapshot = () => send('editor.workspace.snapshot.request');
  const prepare = (s, operations, intent = 'modify') => send('editor.workspace.candidate.prepare', {
    sessionId: s.sessionId, baseWorkspaceHash: s.workspaceHash, catalogVersion: s.catalogVersion,
    proposal: { schemaVersion: 1, intent, summary: 'test', operations },
  });
  const apply = r => send('editor.workspace.candidate.apply', { sessionId: r.sessionId, candidateId: r.candidateId });
  const statements = [
    { kind: 'motor.runPower', port: 4, power: 50 }, { kind: 'motor.runForPowerSeconds', port: 5, power: -20, seconds: 2 },
    { kind: 'motor.stop', port: 6 }, { kind: 'motor.stopModule', port: 7, mode: 'brake' },
    { kind: 'move.directionPower', direction: 'advance', power: 40 }, { kind: 'move.directionPowerSeconds', direction: 'retreat', power: 30, seconds: 1.5 },
    { kind: 'move.differentialPower', leftPower: 50, rightPower: 30 }, { kind: 'move.differentialPowerSeconds', leftPower: 40, rightPower: -40, seconds: 3 },
    { kind: 'move.stop' }, { kind: 'control.sleep', seconds: 1 }, { kind: 'sound.playMusic', note: 36, duration: 0.25 },
  ];
  try {
    const before = snapshot();
    let ready = prepare(before, [{ kind: 'replaceMainScript', statements }], 'create');
    assert.equal(ready.type, 'editor.workspace.candidate.ready', ready.reason);
    assert.equal(workspace.getAllBlocks(false).length, 0, 'candidate mutated original');
    assert.match(ready.code, /50/);
    assert.equal(apply(ready).type, 'editor.workspace.candidate.applied');
    assert.equal(apply(ready).type, 'editor.workspace.candidate.rejected');
    const after = snapshot();
    assert.equal(after.blocks.filter(b => b.role === 'statement').length, 11);
    const motor = after.blocks.find(b => b.statement?.kind === 'motor.runPower');
    ready = prepare(after, [{ kind: 'updateStatement', blockId: motor.id, patch: { power: 80 } }]);
    assert.equal(ready.type, 'editor.workspace.candidate.ready', ready.reason);
    assert.equal(apply(ready).type, 'editor.workspace.candidate.applied');
    assert.equal(send('editor.workspace.candidate.restore', { sessionId: after.sessionId }).type, 'editor.workspace.candidate.applied');
    const restored = snapshot();
    assert.equal(restored.blocks.find(b => b.id === motor.id).statement.power, 50);
    assert.equal(prepare(restored, [{ kind: 'appendToMainScript', statements: [{ kind: 'motor.runPower', port: 99, power: 0 }] }]).type, 'editor.workspace.candidate.rejected');
    assert.equal(snapshot().workspaceHash, restored.workspaceHash);
    console.log('PASS: real Scratch headless workspaces; 11 block kinds, custom fields, Python, isolation, apply, update, restore and invalid input');
  } finally { workspace.dispose(); }
}
`;
const bundle = await build({
  stdin: {
    contents: source,
    resolveDir: root,
    sourcefile: 'assistant-integration.ts',
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  packages: 'external',
  loader: { '.svg': 'text', '.png': 'dataurl', '.mp3': 'base64' },
  alias: Object.fromEntries(
    ['shared', 'i18n', 'assistant-contracts'].map(name => [
      `@scratch-mobile/${name}`,
      path.resolve(root, '..', name, 'src/index.ts'),
    ]),
  ),
});
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(
  require,
  module,
  module.exports,
);
await module.exports.run();
