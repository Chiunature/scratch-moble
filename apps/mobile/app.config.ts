import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Scratch Mobile',
  slug: 'scratch-mobile',
  version: '1.0.0',
  orientation: 'landscape',
  icon: './assets/branding/AppLogo.png',
  scheme: 'scratch-mobile',
  userInterfaceStyle: 'light',
  runtimeVersion: {
    policy: 'appVersion',
  },
  ios: {
    bundleIdentifier: 'com.scratchmobile.app',
    buildNumber: '1',
    supportsTablet: true,
    requireFullScreen: true,
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
        NSAllowsLocalNetworking: true,
      },
      UIBackgroundModes: ['bluetooth-central'],
    },
  },
  android: {
    package: 'com.scratchmobile.app',
    versionCode: 1,
    permissions: ['android.permission.VIBRATE'],
  },
  plugins: [
    './plugins/withExpoModuleGradlePlugin.js',
    'expo-dev-client',
    [
      'expo-navigation-bar',
      {
        hidden: true,
        enforceContrast: false,
        style: 'dark',
      },
    ],
    [
      'expo-status-bar',
      {
        hidden: true,
        style: 'light',
      },
    ],
    [
      'react-native-ble-plx',
      {
        isBackgroundEnabled: true,
        neverForLocation: false,
        modes: ['central'],
        bluetoothAlwaysPermission:
          '此应用需要蓝牙权限来扫描、连接和控制附近的蓝牙设备',
      },
    ],
    [
      './plugins/withLdrawAssets.js',
      {
        source: './assets/ldraw',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 26,
        },
        ios: {
          deploymentTarget: '16.4',
        },
      },
    ],
    './plugins/withAndroidManifestPolicy.js',
  ],
};

export default config;