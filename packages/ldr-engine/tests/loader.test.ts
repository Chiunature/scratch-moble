import { readFileSync } from 'node:fs';
import path from 'node:path';

import { createFilesystemPartReader } from '../src/node';
import { loadMpdFromText } from '../src/loader/loadMpdModel';

const repoRoot = path.resolve(__dirname, '../../..');
const mpdPath = path.resolve(
  repoRoot,
  'apps/mobile/assets/buildGuide/container-demo/.build/export.mpd',
);
const teslaMpdPath = path.resolve(
  repoRoot,
  'apps/mobile/assets/buildGuide/teslaModelS/.build/export.mpd',
);
const ldrawRoot = path.resolve(repoRoot, 'apps/mobile/assets/ldraw');

describe('loadMpdFromText', () => {
  jest.setTimeout(120_000);

  it('loads container-demo mpd from local ldraw library', async () => {
    const mpdText = readFileSync(mpdPath, 'utf8');
    const readLocalPart = createFilesystemPartReader(ldrawRoot);

    const model = await loadMpdFromText(mpdText, 'main.ldr', {
      partsSource: 'local',
      readLocalPart,
      onError(issue) {
        console.warn('[ldr-engine:test]', issue.message, issue.subModel ?? '');
      },
    });

    expect(model.mainModelId).toBe('main.ldr');
    expect(model.stepHandler.getTotalSteps()).toBe(76);
    expect(model.stepHandler.getCurrentStepIndex()).toBe(0);
    expect(model.partsBuilder.parts.length).toBeGreaterThan(0);
    expect(model.root.children.length).toBeGreaterThan(0);
    expect(model.mode).toBe('instruction');
    expect(model.root.scale.x).toBe(1);
  });

  it('preview mode scales root to fit view', async () => {
    const mpdText = readFileSync(mpdPath, 'utf8');
    const readLocalPart = createFilesystemPartReader(ldrawRoot);

    const model = await loadMpdFromText(mpdText, 'main.ldr', {
      partsSource: 'local',
      readLocalPart,
      mode: 'preview',
    });

    expect(model.mode).toBe('preview');
    expect(model.root.scale.x).not.toBe(1);
  });

  it('uses zero-based step indices at the facade boundary', async () => {
    const mpdText = readFileSync(mpdPath, 'utf8');
    const readLocalPart = createFilesystemPartReader(ldrawRoot);

    const model = await loadMpdFromText(mpdText, 'main.ldr', {
      partsSource: 'local',
      readLocalPart,
    });

    const lastStepIndex = model.stepHandler.getTotalSteps() - 1;
    model.stepHandler.moveTo(lastStepIndex);

    expect(model.stepHandler.getCurrentStepIndex()).toBe(lastStepIndex);
    expect(model.stepHandler.nextStep()).toBe(false);
  });

  it('resolves mixed-case mainModelId for tesla mpd', async () => {
    const mpdText = readFileSync(teslaMpdPath, 'utf8');
    const readLocalPart = createFilesystemPartReader(ldrawRoot);

    const model = await loadMpdFromText(mpdText, '2014 - TeslaModelS.ldr', {
      partsSource: 'local',
      readLocalPart,
      onError(issue) {
        console.warn('[ldr-engine:test]', issue.message, issue.subModel ?? '');
      },
    });

    expect(model.mainModelId).toBe('2014 - teslamodels.ldr');
    expect(model.stepHandler.getTotalSteps()).toBeGreaterThan(0);
  });
});
