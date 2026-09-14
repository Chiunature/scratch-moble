import { createMMKV } from 'react-native-mmkv';

/**
 * 全局键值存储实例（MMKV：同步、mmap，读写性能优于 AsyncStorage）。
 * v4 起用 createMMKV 工厂创建实例（MMKV 现在只是类型）。
 * 迁移模块也依赖此实例把旧 AsyncStorage 数据搬运进来。
 */
export const mmkv = createMMKV({ id: 'scratch-mobile' });

/**
 * AsyncStorage 兼容层：对外保留 Promise 版 `getItem/setItem/removeItem`，
 * 底层走 MMKV 同步 API。原有 `await kvStore.getItem(...)` 调用点无需改逻辑。
 */
export const kvStore = {
  getItem(key: string): Promise<string | null> {
    return Promise.resolve(mmkv.getString(key) ?? null);
  },
  setItem(key: string, value: string): Promise<void> {
    mmkv.set(key, value);
    return Promise.resolve();
  },
  removeItem(key: string): Promise<void> {
    mmkv.remove(key);
    return Promise.resolve();
  },
};
