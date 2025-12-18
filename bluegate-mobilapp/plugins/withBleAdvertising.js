const { withAndroidManifest } = require('@expo/config-plugins');

const withBleAdvertising = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // Ensure permissions are added
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.BLUETOOTH_ADVERTISE',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.ACCESS_FINE_LOCATION',
    ];

    permissions.forEach((permission) => {
      if (
        !androidManifest['uses-permission'].find(
          (item) => item.$['android:name'] === permission
        )
      ) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    // Add BLUETOOTH_ADVERTISE feature
    if (!androidManifest['uses-feature']) {
      androidManifest['uses-feature'] = [];
    }

    if (
      !androidManifest['uses-feature'].find(
        (item) => item.$['android:name'] === 'android.hardware.bluetooth_le'
      )
    ) {
      androidManifest['uses-feature'].push({
        $: {
          'android:name': 'android.hardware.bluetooth_le',
          'android:required': 'true',
        },
      });
    }

    return config;
  });
};

module.exports = withBleAdvertising;
