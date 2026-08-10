import { MPD_MANIFEST_VERSION, parseMpdManifest } from '../src';

const MINIMAL_MANIFEST = {
  version: MPD_MANIFEST_VERSION,
  id: 'container-demo',
  nameKey: 'buildGuide.containerDemo',
  mpdUri: 'models/container-demo/build/export.mpd',
  mainModelId: 'container_demo.mpd',
};

const FULL_MANIFEST = {
  version: MPD_MANIFEST_VERSION,
  id: 'tesla-model-s',
  nameKey: 'buildGuide.teslaModelS',
  mpdUri: 'models/tesla-model-s/build/export.mpd',
  mainModelId: 'tesla_model_s.mpd',
  partsSource: 'local-then-remote',
  partsBaseUrl: 'https://example.com/parts/',
  mainModelColor: 0xffffff,
  mode: 'instruction',
  displayScale: 1.2,
  cameraDefault: {
    position: [10, 7, 10],
    target: [0, 0, 0],
  },
  steps: [
    {
      index: 0,
      titleKey: 'step.title.first',
      descriptionKey: 'step.desc.first',
      displayScale: 1.5,
      camera: {
        position: [8, 6, 8],
        target: [0, 1, 0],
      },
    },
    {
      index: 1,
      camera: {
        position: [-8, 6, -8],
        target: [0, 0, 1],
      },
    },
  ],
};

describe('parseMpdManifest', () => {
  it('解析合法最小 manifest，可选字段缺省', () => {
    const manifest = parseMpdManifest(MINIMAL_MANIFEST);

    expect(manifest).toEqual({
      ...MINIMAL_MANIFEST,
      partsSource: undefined,
      steps: undefined,
    });
    expect(manifest.mode).toBeUndefined();
    expect(manifest.cameraDefault).toBeUndefined();
  });

  it('解析合法完整 manifest（含 steps override 全字段）', () => {
    const manifest = parseMpdManifest(FULL_MANIFEST);

    expect(manifest.partsSource).toBe('local-then-remote');
    expect(manifest.cameraDefault?.position).toEqual([10, 7, 10]);
    expect(manifest.steps).toHaveLength(2);
    expect(manifest.steps?.[0]).toEqual({
      index: 0,
      titleKey: 'step.title.first',
      descriptionKey: 'step.desc.first',
      displayScale: 1.5,
      camera: {
        position: [8, 6, 8],
        target: [0, 1, 0],
      },
    });
    // 缺省字段不补默认值，保持与源数据一致
    expect(manifest.steps?.[1].titleKey).toBeUndefined();
  });

  it('版本不匹配时报错', () => {
    expect(() =>
      parseMpdManifest({ ...MINIMAL_MANIFEST, version: 999 }),
    ).toThrow('unsupported manifest version');
  });

  it('必填字段缺失或为空时报错', () => {
    expect(() => parseMpdManifest({ ...MINIMAL_MANIFEST, id: '' })).toThrow(
      'manifest.id must be a non-empty string',
    );
    expect(() =>
      parseMpdManifest({ ...MINIMAL_MANIFEST, mainModelId: 42 }),
    ).toThrow('manifest.mainModelId must be a non-empty string');
  });

  it('非对象输入时报错', () => {
    expect(() => parseMpdManifest(null)).toThrow('manifest must be an object');
    expect(() => parseMpdManifest('x')).toThrow('manifest must be an object');
  });

  it('steps 必须为数组且 index 连续', () => {
    expect(() =>
      parseMpdManifest({ ...MINIMAL_MANIFEST, steps: { index: 0 } }),
    ).toThrow('manifest.steps must be an array');
    expect(() =>
      parseMpdManifest({ ...MINIMAL_MANIFEST, steps: [{ index: 1 }] }),
    ).toThrow('manifest.steps[0].index must equal 0');
  });

  it('camera 结构校验（position/target 必须为 3 元组）', () => {
    // readTuple3 报错使用 manifest. 前缀，不带嵌套 path
    expect(() =>
      parseMpdManifest({
        ...MINIMAL_MANIFEST,
        cameraDefault: { position: [1, 2], target: [0, 0, 0] },
      }),
    ).toThrow('manifest.position must be a 3-number tuple');

    expect(() =>
      parseMpdManifest({
        ...MINIMAL_MANIFEST,
        steps: [{ index: 0, camera: { position: [1, 2, 3], target: [0, 0] } }],
      }),
    ).toThrow('manifest.target must be a 3-number tuple');
  });

  it('mode 非法值时报错', () => {
    expect(() =>
      parseMpdManifest({ ...MINIMAL_MANIFEST, mode: 'bogus' }),
    ).toThrow('manifest.mode must be instruction or preview');
  });

  it('displayScale 非数字 / steps 级非正数时报错', () => {
    expect(() =>
      parseMpdManifest({ ...MINIMAL_MANIFEST, displayScale: '1.2' }),
    ).toThrow('manifest.displayScale must be a number');
    expect(() =>
      parseMpdManifest({
        ...MINIMAL_MANIFEST,
        steps: [{ index: 0, displayScale: -1 }],
      }),
    ).toThrow('manifest.steps[0].displayScale must be a positive number');
  });

  it('partsSource 非法值时报错', () => {
    expect(() =>
      parseMpdManifest({ ...MINIMAL_MANIFEST, partsSource: 'cdn' }),
    ).toThrow(
      'manifest.partsSource must be local, remote, or local-then-remote',
    );
  });
});