import { Platform } from 'react-native';
import { create } from 'zustand';

/**
 * 当前进程的平台。启动时判定一次，之后不会变，因此没有写入方法。
 * 组件用 selector；模块顶层和样式表用 getState()。
 */
type PlatformStore = {
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  monospaceFontFamily: string;
};

export const usePlatformStore = create<PlatformStore>(() => ({
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isWeb: Platform.OS === 'web',
  monospaceFontFamily:
    Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }) ?? 'monospace',
}));
