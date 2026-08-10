import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  Linking,
  Platform,
  type ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@scratch-mobile/i18n';

import backIcon from '../../../assets/bleDevicesScreen/back.png';
import {
  bleConnectionController,
  type BleDevice,
  bleLog,
  loadPairedDevices,
  normalizeBleDevice,
  normalizeBleDeviceId,
  type PairedBleDevice,
  removePairedDevice,
  TARGET_DEVICE_NAME,
} from '../../services/ble';
import { useBleStore } from '../../store/useBleStore';
import { styles } from './BleDevicesScreen.styles';
import bleLogo from '../../../assets/homeScreen/bleIcon.png';
import { RippleEffect } from './components/RippleRing';
import { BreathingDot } from './components/breathingDot';
import { DeviceListItem } from './components/DeviceListItem';
const BLUETOOTH_STATES = [
  'PoweredOn',
  'PoweredOff',
  'Unauthorized',
  'Unsupported',
  'Resetting',
  'Unknown',
] as const;

type BluetoothStateKey = (typeof BLUETOOTH_STATES)[number];

function isBluetoothStateKey(value: string): value is BluetoothStateKey {
  return BLUETOOTH_STATES.includes(value as BluetoothStateKey);
}

function getConnectedDeviceLabel(device: BleDevice): string {
  const name = device.name?.trim();
  return name || device.id;
}

function buildScannedDeviceMap(devices: BleDevice[]): Map<string, BleDevice> {
  const map = new Map<string, BleDevice>();
  for (const device of devices) {
    const normalized = normalizeBleDevice(device);
    map.set(normalized.id, normalized);
  }
  return map;
}

function confirmDestructive(
  title: string,
  message: string,
  labels: { cancel: string; confirm: string },
  onConfirm: () => void,
) {
  Alert.alert(title, message, [
    { text: labels.cancel, style: 'cancel' },
    { text: labels.confirm, style: 'destructive', onPress: onConfirm },
  ]);
}

export function BleDevicesScreen() {
  const { t } = useTranslation('ble');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const getBluetoothStateLabel = useCallback(
    (state: string) =>
      isBluetoothStateKey(state) ? t(`bluetoothState.${state}`) : state,
    [t],
  );
  const bluetoothState = useBleStore(state => state.bluetoothState);
  const connectionStatus = useBleStore(state => state.connectionStatus);
  const connectedDevice = useBleStore(state => state.connectedDevice);
  const isScanning = useBleStore(state => state.isScanning);
  const connectedDeviceId = connectedDevice?.id ?? null;
  const isConnecting = connectionStatus === 'connecting';

  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [pairedDevices, setPairedDevices] = useState<PairedBleDevice[]>([]);
  const [isPaired, setIsPaired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scannedDeviceMap = useMemo(
    () => buildScannedDeviceMap(devices),
    [devices],
  );

  const handleError = useCallback(
    (error: unknown, errorKey: string) => {
      const message = error instanceof Error ? error.message : t(errorKey);
      setErrorMessage(message);
      return message;
    },
    [t],
  );

  const isConnectedToDevice = useCallback(
    (deviceId: string) =>
      connectedDeviceId != null &&
      normalizeBleDeviceId(connectedDeviceId) ===
        normalizeBleDeviceId(deviceId),
    [connectedDeviceId],
  );

  const upsertDevice = useCallback((device: BleDevice) => {
    const normalizedDevice = normalizeBleDevice(device);
    setDevices(prev => {
      const index = prev.findIndex(item => item.id === normalizedDevice.id);
      if (index === -1) {
        return [...prev, normalizedDevice];
      }
      const next = [...prev];
      next[index] = normalizedDevice;
      return next;
    });
  }, []);

  const refreshPairedDevices = useCallback(async () => {
    const list = await loadPairedDevices();
    setPairedDevices(list);
  }, []);

  const handleDisconnect = useCallback(async () => {
    setErrorMessage(null);

    try {
      await bleConnectionController.disconnect();
      bleLog.info('已主动断开连接');
    } catch (error) {
      handleError(error, 'errors.disconnectFailed');
    }
  }, [handleError]);

  const handleConnect = useCallback(
    async (device: BleDevice) => {
      if (useBleStore.getState().connectionStatus === 'connecting') {
        return;
      }

      setErrorMessage(null);
      const normalizedDevice = normalizeBleDevice(device);

      try {
        const result = await bleConnectionController.connect(normalizedDevice);
        setPairedDevices(result.pairedDevices);
        bleLog.info('已连接并加入已配对列表', normalizedDevice.id);

        if (result.watchError) {
          const message =
            result.watchError instanceof Error
              ? result.watchError.message
              : '';
          setErrorMessage(
            message
              ? t('errors.connectedWatchFailedWithMessage', { message })
              : t('errors.connectedWatchFailed'),
          );
        }
      } catch (error) {
        handleError(error, 'errors.connectFailed');
      }
    },
    [handleError, t],
  );

  const handleDevicePress = useCallback(
    (device: BleDevice) => {
      if (isConnecting) {
        return;
      }

      const scanned = scannedDeviceMap.get(normalizeBleDeviceId(device.id));

      if (isConnectedToDevice(device.id)) {
        confirmDestructive(
          t('alerts.disconnectTitle'),
          t('alerts.disconnectMessage'),
          { cancel: t('alerts.cancel'), confirm: t('alerts.disconnect') },
          () => {
            void handleDisconnect();
          },
        );
        return;
      }

      void handleConnect(scanned ?? device);
    },
    [
      handleConnect,
      handleDisconnect,
      isConnectedToDevice,
      isConnecting,
      scannedDeviceMap,
      t,
    ],
  );

  const handleRemovePaired = useCallback(
    (device: PairedBleDevice) => {
      confirmDestructive(
        t('alerts.removePairedTitle'),
        t('alerts.removePairedMessage', { name: device.name }),
        { cancel: t('alerts.cancel'), confirm: t('alerts.remove') },
        () => {
          void (async () => {
            try {
              if (isConnectedToDevice(device.id)) {
                await handleDisconnect();
              }
              const next = await removePairedDevice(device.id);
              setPairedDevices(next);
            } catch (error) {
              handleError(error, 'errors.removePairedFailed');
            }
          })();
        },
      );
    },
    [handleDisconnect, handleError, isConnectedToDevice, t],
  );

  const handleScan = useCallback(async () => {
    if (bluetoothState !== 'PoweredOn') {
      setErrorMessage(t('errors.enableBluetoothFirst'));
      return;
    }

    if (isScanning) {
      bleConnectionController.stopScan();
      return;
    }

    setErrorMessage(null);
    if (!isPaired) {
      setDevices([]);
    }

    try {
      await bleConnectionController.startScan(upsertDevice);
    } catch (error) {
      handleError(error, 'errors.scanFailed');
    }
  }, [bluetoothState, handleError, isPaired, isScanning, t, upsertDevice]);

  const handleSwitchTab = useCallback((pairedTab: boolean) => {
    setIsPaired(pairedTab);
  }, []);

  const openSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
        return;
      }
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
        return;
      }
    } catch (error) {
      Alert.alert(
        t('errors.openSettingsFailed'),
        error instanceof Error ? error.message : t('errors.openSettingsFailed'),
      );
    }
  }, [t]);

  const renderAvailableItem = useCallback(
    ({ item }: ListRenderItemInfo<BleDevice>) => (
      <DeviceListItem
        item={item}
        isConnected={isConnectedToDevice(item.id)}
        isPairedTab={false}
        isOnline
        scanned={scannedDeviceMap.get(item.id)}
        disabled={isConnecting && !isConnectedToDevice(item.id)}
        onPress={() => handleDevicePress(item)}
      />
    ),
    [handleDevicePress, isConnectedToDevice, isConnecting, scannedDeviceMap],
  );

  const renderPairedItem = useCallback(
    ({ item }: ListRenderItemInfo<PairedBleDevice>) => (
      <DeviceListItem
        item={item}
        isConnected={isConnectedToDevice(item.id)}
        isPairedTab
        isOnline={scannedDeviceMap.has(item.id)}
        scanned={scannedDeviceMap.get(item.id)}
        disabled={isConnecting && !isConnectedToDevice(item.id)}
        onPress={() => handleDevicePress(item)}
        onLongPress={() => handleRemovePaired(item)}
      />
    ),
    [
      handleDevicePress,
      handleRemovePaired,
      isConnectedToDevice,
      isConnecting,
      scannedDeviceMap,
    ],
  );

  useEffect(() => () => bleConnectionController.stopScan(), []);

  useFocusEffect(
    useCallback(() => {
      void refreshPairedDevices();
    }, [refreshPairedDevices]),
  );

  useEffect(() => {
    if (bluetoothState == null || bluetoothState === 'PoweredOn') {
      return;
    }

    bleConnectionController.stopScan();
    setDevices([]);

    setErrorMessage(
      bluetoothState === 'PoweredOff'
        ? t('errors.bluetoothOff')
        : t('errors.bluetoothUnavailableWithState', {
            state: getBluetoothStateLabel(bluetoothState),
          }),
    );
  }, [bluetoothState, getBluetoothStateLabel, t]);

  const isBluetoothReady = bluetoothState === 'PoweredOn';
  const showScanning = isScanning && isBluetoothReady;
  const stateLabel =
    bluetoothState != null
      ? getBluetoothStateLabel(bluetoothState)
      : t('detecting');
  const connectionLabel = isConnecting
    ? t('connecting')
    : connectedDevice
    ? t('connectedWithName', {
        deviceName: getConnectedDeviceLabel(connectedDevice),
      })
    : t('notConnected');

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Image source={backIcon} style={styles.backIcon} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('title')}</Text>
        <Pressable
          style={[
            styles.scanButton,
            showScanning ? styles.scanButtonActive : styles.scanButtonIdle,
            !isBluetoothReady && !showScanning && styles.scanButtonDisabled,
          ]}
          onPress={handleScan}
          disabled={!isBluetoothReady && !showScanning}
        >
          <Text
            style={[
              styles.scanButtonText,
              showScanning
                ? styles.scanButtonTextActive
                : styles.scanButtonTextIdle,
            ]}
          >
            {showScanning ? t('stopScan') : t('startScan')}
          </Text>
        </Pressable>
      </View>
      <View style={styles.container}>
        <View style={styles.statusContainer}>
          <View style={styles.bleLogoContainer}>
            <RippleEffect active={showScanning} />
            <View style={styles.bleLogoInnerContainer}>
              <Image source={bleLogo} style={styles.bleLogo} />
            </View>
            <View style={styles.scanningStatusContainer}>
              <Text style={styles.scanningStatusLabel}>
                {!isBluetoothReady
                  ? t('bluetoothUnavailable')
                  : showScanning
                  ? t('scanning')
                  : t('scanningPaused')}
              </Text>
              {showScanning && (
                <Text style={styles.discoveredCountText}>
                  {t('discoveredDevices', { count: devices.length })}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.connectStatusContainer}>
            <Text style={styles.statusText}>{connectionLabel}</Text>
          </View>
        </View>
        <View style={styles.listContentContainer}>
          <View style={styles.listHeader}>
            <Pressable
              style={[
                styles.listHeaderButton,
                !isPaired
                  ? styles.listHeaderButtonActive
                  : styles.listHeaderButtonInactive,
              ]}
              onPress={() => handleSwitchTab(false)}
            >
              <Text
                style={[
                  styles.listHeaderButtonText,
                  !isPaired && styles.listHeaderButtonTextActive,
                ]}
              >
                {t('availableDevices')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.listHeaderButton,
                isPaired
                  ? styles.listHeaderButtonActive
                  : styles.listHeaderButtonInactive,
              ]}
              onPress={() => handleSwitchTab(true)}
            >
              <Text
                style={[
                  styles.listHeaderButtonText,
                  isPaired && styles.listHeaderButtonTextActive,
                ]}
              >
                {t('pairedDevices')}
              </Text>
            </Pressable>
          </View>
          {!isPaired ? (
            !isBluetoothReady ? (
              <Text style={styles.emptyText}>{t('enableBluetoothToScan')}</Text>
            ) : showScanning ? (
              <FlatList
                data={devices}
                keyExtractor={item => item.id}
                extraData={{ connectedDeviceId, isConnecting }}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    {t('searchingTarget', { deviceName: TARGET_DEVICE_NAME })}
                  </Text>
                }
                renderItem={renderAvailableItem}
              />
            ) : (
              <Text style={styles.emptyText}>{t('tapToStartScan')}</Text>
            )
          ) : (
            <FlatList
              data={pairedDevices}
              keyExtractor={item => item.id}
              extraData={{ connectedDeviceId, isConnecting, scannedDeviceMap }}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                pairedDevices.length > 0 ? (
                  <Text style={styles.deviceHint}>
                    {t('longPressToRemove')}
                  </Text>
                ) : null
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>{t('pairedEmpty')}</Text>
              }
              renderItem={renderPairedItem}
            />
          )}
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerStatusText}>
          <BreathingDot
            size={10}
            color={bluetoothState === 'PoweredOn' ? '#36a442' : '#ff6666'}
            duration={1500}
          />{' '}
          {stateLabel}
        </Text>
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
        <Pressable onPress={openSettings} style={styles.openSettingsButton}>
          <Text style={styles.openSettingsText}>{t('openSettings')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
