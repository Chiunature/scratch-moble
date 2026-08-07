import {
  createEmptyWatchDeviceList,
  distinguishDevice,
  drainDeviceWatchJsonBuffer,
  parseDeviceData,
  readHostWillAiState,
} from '../src/deviceWatch';

const PAYLOAD_WITH_TOUCH = {
  deviceList: [{ port: 0, touch: { state: 1 } }],
  WillAiState: 'run',
};

describe('drainDeviceWatchJsonBuffer', () => {
  it('提取完整 JSON 对象，保留残余', () => {
    const { packets, remainder } = drainDeviceWatchJsonBuffer(
      '{"a":1}{"b":2}',
    );
    expect(packets).toEqual(['{"a":1}', '{"b":2}']);
    expect(remainder).toBe('');
  });

  it('跳过前缀脏字节', () => {
    const { packets } = drainDeviceWatchJsonBuffer('xx{"a":1}');
    expect(packets).toEqual(['{"a":1}']);
  });

  it('字符串内的大括号不计入嵌套深度', () => {
    const input = '{"s":"{not a key}","n":2}';
    const { packets, remainder } = drainDeviceWatchJsonBuffer(input);
    expect(packets).toEqual([input]);
    expect(remainder).toBe('');
  });

  it('不完整对象保留在 remainder', () => {
    const { packets, remainder } = drainDeviceWatchJsonBuffer('{"a":1');
    expect(packets).toEqual([]);
    expect(remainder).toBe('{"a":1');
  });

  it('连续不完整对象拼包后能完整提取', () => {
    const first = '{"a":{"n":1';
    const second = '},"b":2}';
    const { remainder } = drainDeviceWatchJsonBuffer(first);
    expect(remainder).toBe(first);
    const { packets } = drainDeviceWatchJsonBuffer(remainder + second);
    expect(packets).toEqual(['{"a":{"n":1},"b":2}']);
  });
});

describe('parseDeviceData', () => {
  it('合法载荷解析成功', () => {
    const parsed = parseDeviceData(JSON.stringify(PAYLOAD_WITH_TOUCH));
    expect(parsed?.deviceList).toHaveLength(1);
  });

  it('空字符串 / 空 deviceList / 非法 JSON 均返回 null', () => {
    expect(parseDeviceData('')).toBeNull();
    expect(parseDeviceData('{"deviceList":[]}')).toBeNull();
    expect(parseDeviceData('not-json')).toBeNull();
    expect(parseDeviceData(null as unknown as string)).toBeNull();
  });
});

describe('readHostWillAiState', () => {
  it('识别 run / stop，其他值返回 undefined', () => {
    expect(readHostWillAiState({ deviceList: [], WillAiState: 'run' })).toBe(
      'run',
    );
    expect(readHostWillAiState({ deviceList: [], WillAiState: 'stop' })).toBe(
      'stop',
    );
    expect(readHostWillAiState({ deviceList: [] })).toBeUndefined();
    expect(
      readHostWillAiState({ deviceList: [], WillAiState: 'paused' }),
    ).toBeUndefined();
  });
});

describe('distinguishDevice', () => {
  it('color 传感器归一化 rgb（上限 255）', () => {
    const result = distinguishDevice({
      deviceList: [{ color: { r: 100, g: 300, b: 50 } }],
    });
    const color = result.deviceList[0].color as { rgb: string };
    expect(color.rgb).toBe('rgb(100, 255, 50)');
    expect(result.deviceList[0].sensing_device).toBe('color');
  });

  it('big_motor / small_motor 归入 motor 并标记 deviceId', () => {
    const big = distinguishDevice({
      deviceList: [{ big_motor: { speed: 1 } }],
    }).deviceList[0];
    expect(big.motor).toBeDefined();
    expect(big.sensing_device).toBe('big_motor');
    expect(big.deviceId).toBe('a5');

    const small = distinguishDevice({
      deviceList: [{ small_motor: { speed: 1 } }],
    }).deviceList[0];
    expect(small.sensing_device).toBe('small_motor');
    expect(small.deviceId).toBe('a6');
  });

  it('ultrasion / touch 分别标记', () => {
    const u = distinguishDevice({ deviceList: [{ ultrasion: {} }] })
      .deviceList[0];
    expect(u.sensing_device).toBe('superSound');
    expect(u.deviceId).toBe('a3');

    const t = distinguishDevice({ deviceList: [{ touch: {} }] })
      .deviceList[0];
    expect(t.sensing_device).toBe('touch');
    expect(t.deviceId).toBe('a4');
  });

  it('gray 传感器将数字键归一化为 n/b 字符串', () => {
    const result = distinguishDevice({
      deviceList: [{ gray: { '1': 5, b1: 3, t3: 1 } }],
    }).deviceList[0];
    const gray = result.gray as { n: string; b: string };
    expect(gray.n).toContain('1:5');
    expect(gray.b).toContain('b1:3');
  });

  it('dev_null 标记端口为异常', () => {
    const item = distinguishDevice({ deviceList: [{ 'dev null': {} }] })
      .deviceList[0];
    expect(item.sensing_device).toBe('deviceAbnormal');
    expect(item.deviceId).toBe('dev_null');
  });

  it('无设备字段的端口标记为 noDevice', () => {
    const item = distinguishDevice({ deviceList: [{ port: 3 }] })
      .deviceList[0];
    expect(item.sensing_device).toBe('noDevice');
    expect(item.deviceId).toBe('0');
  });
});

describe('createEmptyWatchDeviceList', () => {
  it('生成指定端口数空列表', () => {
    const list = createEmptyWatchDeviceList(4);
    expect(list).toHaveLength(4);
    expect(list[0]).toMatchObject({
      port: 0,
      sensing_device: 'noDevice',
      deviceId: '0',
    });
  });
});