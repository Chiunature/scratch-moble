import { isBleDisconnectError } from '../src/services/ble/core/logger';

describe('isBleDisconnectError', () => {
  it('把 iOS 取消通知当成连接结束', () => {
    const error = Object.assign(new Error('Operation was cancelled'), {
      errorCode: 2,
    });

    expect(isBleDisconnectError(error)).toBe(true);
  });

  it('把 Android 断开当成连接结束', () => {
    expect(
      isBleDisconnectError(
        Object.assign(new Error('Device disconnected'), {
          errorCode: 201,
        }),
      ),
    ).toBe(true);
    expect(isBleDisconnectError(new Error('Device is disconnected'))).toBe(
      true,
    );
  });

  it('保留真正的通知失败', () => {
    expect(
      isBleDisconnectError(
        Object.assign(new Error('Characteristic notify change failed'), {
          errorCode: 302,
        }),
      ),
    ).toBe(false);
  });
});
