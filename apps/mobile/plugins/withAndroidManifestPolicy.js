const {
  createRunOncePlugin,
  withAndroidManifest,
} = require('expo/config-plugins');

const PLUGIN_NAME = 'with-android-manifest-policy';
const PLUGIN_VERSION = '1.0.0';
const ANDROID_NAME = 'android:name';
const TOOLS_NAMESPACE = 'http://schemas.android.com/tools';
const BLE_SCAN_PERMISSION = 'android.permission.BLUETOOTH_SCAN';
const BLOCKED_STORAGE_PERMISSIONS = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

function ensureToolsNamespace(androidManifest) {
  androidManifest.manifest.$ = androidManifest.manifest.$ || {};
  androidManifest.manifest.$['xmlns:tools'] =
    androidManifest.manifest.$['xmlns:tools'] || TOOLS_NAMESPACE;
}

function replacePermission(androidManifest, permissionName, attributes) {
  const permissions = androidManifest.manifest['uses-permission'] || [];
  const retainedPermissions = permissions.filter(
    permission => permission.$?.[ANDROID_NAME] !== permissionName,
  );

  androidManifest.manifest['uses-permission'] = [
    ...retainedPermissions,
    {
      $: {
        [ANDROID_NAME]: permissionName,
        ...attributes,
      },
    },
  ];
}

function withAndroidManifestPolicy(config) {
  return withAndroidManifest(config, modConfig => {
    const androidManifest = modConfig.modResults;
    ensureToolsNamespace(androidManifest);

    for (const permission of BLOCKED_STORAGE_PERMISSIONS) {
      replacePermission(androidManifest, permission, {
        'tools:node': 'remove',
      });
    }

    replacePermission(androidManifest, BLE_SCAN_PERMISSION, {
      'tools:remove': 'android:usesPermissionFlags',
    });

    const application = androidManifest.manifest.application?.[0];
    if (!application) {
      throw new Error(`[${PLUGIN_NAME}] Android application node was not found.`);
    }

    application.$ = application.$ || {};
    application.$['android:allowBackup'] = 'false';

    return modConfig;
  });
}

module.exports = createRunOncePlugin(
  withAndroidManifestPolicy,
  PLUGIN_NAME,
  PLUGIN_VERSION,
);