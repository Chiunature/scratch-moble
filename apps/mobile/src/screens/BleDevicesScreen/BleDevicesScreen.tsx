import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  Linking,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import backIcon from '../../../assets/bleDevicesScreen/back.png';
import {
  bleDeviceManager,
  type BleDevice,
  bleLog,
  isDeviceInScanList,
  loadPairedDevices,
  type PairedBleDevice,
  removePairedDevice,
  savePairedDevice,
  startScan,
  stopScan,
} from '../../services/ble';
import { useBleStore } from '../../store/useBleStore';
import { styles } from './BleDevicesScreen.styles';
import bleLogo from '../../../assets/homeScreen/bleIcon.png';
import { RippleEffect } from './components/RippleRing';
import { DeviceListItem } from './components/DeviceListItem';
import { BreathingDot } from './components/breathingDot';

// ==================== 常量定义 ====================
const bluetoothStateLabel: Record<string, string> = {
  PoweredOn: '蓝牙已开启',
  PoweredOff: '蓝牙已关闭',
  Unauthorized: '未授权',
  Unsupported: '不支持蓝牙',
  Resetting: '重置中',
  Unknown: '未知',
};

// ==================== 工具函数（移到组件外部）====================
function getScannedDevice(
  deviceId: string,
  scannedDevices: BleDevice[],
): BleDevice | undefined {
  const normalizedId = deviceId.toUpperCase();
  return scannedDevices.find(
    device => device.id.toUpperCase() === normalizedId,
  );
}

function normalizeBleDevice(device: BleDevice): BleDevice {
  return {
    ...device,
    id: device.id.toUpperCase(),
  };
}

// ==================== 主组件 ====================
export function BleDevicesScreen() {
  // 1. 所有 Hooks 必须按固定顺序调用
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const bluetoothState = useBleStore(state => state.bluetoothState);
  const connectedDevice = useBleStore(state => state.connectedDevice);
  const connectedDeviceId = connectedDevice?.id ?? null;

  // 2. State 声明
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [pairedDevices, setPairedDevices] = useState<PairedBleDevice[]>([]);
  const [isPaired, setIsPaired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 3. 稳定的函数（不依赖 props/state 或依赖为空）
  const upsertDevice = useCallback((device: BleDevice) => {
    setDevices(prev => {
      const index = prev.findIndex(item => item.id === device.id);
      if (index === -1) {
        return [...prev, device];
      }
      const next = [...prev];
      next[index] = device;
      return next;
    });
  }, []); // ✅ 空依赖，setDevices 稳定

  const refreshPairedDevices = useCallback(async () => {
    const list = await loadPairedDevices();
    setPairedDevices(list);
  }, []); // ✅ 空依赖

  // 4. 依赖其他回调/状态的函数
  const handleDisconnect = useCallback(async () => {
    setErrorMessage(null);
    const { resetConnection } = useBleStore.getState();

    try {
      console.log('handleDisconnect');
      console.log(
        'bleDeviceManager.isConnected()',
        bleDeviceManager.isConnected(),
      );

      if (bleDeviceManager.isConnected()) {
        try {
          await bleDeviceManager.stopDeviceWatch();
          console.log('停止设备监控');
        } catch {
          // 监控可能未开启或连接已不稳定，继续尝试断开
        }
        console.log('准备断开连接');
        await bleDeviceManager.disconnect();
      }
      resetConnection();
      bleLog.info('已主动断开连接');
    } catch (error) {
      resetConnection();
      setErrorMessage(error instanceof Error ? error.message : '断开失败');
    }
  }, []); // ✅ 空依赖，使用的都是外部稳定函数

  const handleConnect = useCallback(
    async (device: BleDevice) => {
      setErrorMessage(null);
      const { setConnectionStatus, setConnectedDevice, resetConnection } =
        useBleStore.getState();
      const normalizedDevice = normalizeBleDevice(device);

      try {
        if (isScanning) {
          stopScan();
          setIsScanning(false);
        }

        setConnectionStatus('connecting');

        if (
          bleDeviceManager.isConnected() &&
          connectedDeviceId?.toUpperCase() !== normalizedDevice.id
        ) {
          await bleDeviceManager.disconnect().catch(() => undefined);
          resetConnection();
        }

        await bleDeviceManager.connect(normalizedDevice.id, () => {
          bleLog.info('设备已断开', normalizedDevice.id);
          useBleStore.getState().resetConnection();
        });

        const pairedList = await savePairedDevice(normalizedDevice);
        setPairedDevices(pairedList);
        setConnectedDevice(normalizedDevice);
        setConnectionStatus('connected');
        bleLog.info('已连接并加入已配对列表', normalizedDevice.id);

        try {
          await bleDeviceManager.startDeviceWatch();
        } catch (watchError) {
          bleLog.warn(
            '设备监控开启失败',
            watchError instanceof Error ? watchError.message : watchError,
          );
          setErrorMessage(
            watchError instanceof Error
              ? `已连接，但监控开启失败：${watchError.message}`
              : '已连接，但监控开启失败',
          );
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : '连接失败');
        resetConnection();
      }
    },
    [isScanning, connectedDeviceId], // ✅ 添加缺失的依赖
  );

  const handleRemovePaired = useCallback(
    (device: PairedBleDevice) => {
      Alert.alert('移除已配对设备', `确定移除 ${device.name} 吗？`, [
        { text: '取消', style: 'cancel' },
        {
          text: '移除',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (
                connectedDeviceId?.toUpperCase() === device.id.toUpperCase()
              ) {
                await handleDisconnect();
              }
              const next = await removePairedDevice(device.id);
              setPairedDevices(next);
            })();
          },
        },
      ]);
    },
    [connectedDeviceId, handleDisconnect], // ✅ 添加依赖
  );

  const handleScan = useCallback(async () => {
    if (bluetoothState !== 'PoweredOn') {
      setErrorMessage('请先打开系统蓝牙');
      return;
    }

    if (isScanning) {
      stopScan();
      setIsScanning(false);
      return;
    }

    setErrorMessage(null);
    if (!isPaired) {
      setDevices([]);
    }

    try {
      await startScan(upsertDevice);
      setIsScanning(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '扫描失败');
      setIsScanning(false);
    }
  }, [bluetoothState, isScanning, isPaired, upsertDevice]); // ✅ 添加依赖

  const handleSwitchTab = useCallback((pairedTab: boolean) => {
    setIsPaired(pairedTab);
  }, []); // ✅ 空依赖

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
        '打开设置失败',
        error instanceof Error ? error.message : '打开设置失败',
      );
    }
  }, []); // ✅ 空依赖

  // 5. 渲染相关的函数（不需要 useCallback）
  const renderDeviceItem = (item: BleDevice, onLongPress?: () => void) => {
    const isConnected =
      connectedDeviceId?.toUpperCase() === item.id.toUpperCase();
    const isOnline = isDeviceInScanList(item.id, devices);
    const scanned = getScannedDevice(item.id, devices);

    return (
      <DeviceListItem
        item={item}
        isConnected={isConnected}
        isPairedTab={isPaired}
        isOnline={isOnline}
        scanned={scanned}
        onPress={() => {
          console.log('isConnected', isConnected);
          console.log('scanned', scanned);
          console.log('isOnline', isOnline);
          if (isConnected) {
            Alert.alert('断开连接', '确定断开连接吗？', [
              { text: '取消', style: 'cancel' },
              {
                text: '断开',
                style: 'destructive',
                onPress: () => {
                  void handleDisconnect();
                },
              },
            ]);
            return;
          }
          void handleConnect(scanned ?? item);
        }}
        onLongPress={onLongPress}
      />
    );
  };

  // 6. Effects
  useEffect(() => {
    void refreshPairedDevices();
    return () => {
      stopScan();
    };
  }, [refreshPairedDevices]);

  useFocusEffect(
    useCallback(() => {
      void refreshPairedDevices();
    }, [refreshPairedDevices]),
  );

  useEffect(() => {
    if (bluetoothState == null || bluetoothState === 'PoweredOn') {
      return;
    }

    stopScan();
    setIsScanning(false);
    setDevices([]);

    setErrorMessage(
      bluetoothState === 'PoweredOff'
        ? '蓝牙已关闭，请打开系统蓝牙'
        : `蓝牙不可用（${bluetoothStateLabel[bluetoothState] ?? bluetoothState}）`,
    );
  }, [bluetoothState]);

  // 7. 计算值（非响应式，但基于 state）
  const isBluetoothReady = bluetoothState === 'PoweredOn';
  const showScanning = isScanning && isBluetoothReady;
  const stateLabel =
    bluetoothState != null
      ? bluetoothStateLabel[bluetoothState] ?? bluetoothState
      : '检测中...';

  // 8. 渲染
  return (
    <View style={styles.root}>
      {/* 你的 JSX 内容保持不变 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Image source={backIcon} style={styles.backIcon} />
        </Pressable>
        <Text style={styles.headerTitle}>蓝牙设备</Text>
        <Pressable
          style={[
            styles.scanButton,
            {
              backgroundColor: showScanning ? '#007aff' : 'transparent',
              borderWidth: 1,
              borderColor: showScanning ? '#007aff' : '#e0e0e0',
              opacity: isBluetoothReady ? 1 : 0.45,
            },
          ]}
          onPress={handleScan}
          disabled={!isBluetoothReady && !showScanning}
        >
          <Text
            style={[
              styles.scanButtonText,
              { color: showScanning ? '#ffffff' : '#007aff' },
            ]}
          >
            {showScanning ? '停止扫描' : '开始扫描'}
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
              <Text style={{ color: '#a7aeb9', fontSize: 12 }}>
                {!isBluetoothReady
                  ? '蓝牙不可用'
                  : showScanning
                    ? '正在扫描...'
                    : '扫描已暂停'}
              </Text>
              {showScanning && (
                <Text
                  style={{ color: '#333', fontWeight: '900', fontSize: 16 }}
                >
                  发现{devices.length}个设备
                </Text>
              )}
            </View>
          </View>
          <View style={styles.connectStatusContainer}>
            <Text style={styles.statusText}>
              {connectedDevice ? `已连接 · ${connectedDevice.name}` : '未连接'}
            </Text>
          </View>
        </View>
        <View style={styles.listContentContainer}>
          <View style={styles.listHeader}>
            <Pressable
              style={[
                styles.listHeaderButton,
                !isPaired
                  ? { borderBottomWidth: 1, borderBottomColor: '#007aff' }
                  : {},
              ]}
              onPress={() => handleSwitchTab(false)}
            >
              <Text
                style={[
                  styles.listHeaderButtonText,
                  !isPaired ? { color: '#007aff' } : {},
                ]}
              >
                可用设备
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.listHeaderButton,
                isPaired
                  ? { borderBottomWidth: 1, borderBottomColor: '#007aff' }
                  : {},
              ]}
              onPress={() => handleSwitchTab(true)}
            >
              <Text
                style={[
                  styles.listHeaderButtonText,
                  isPaired ? { color: '#007aff' } : {},
                ]}
              >
                已配对
              </Text>
            </Pressable>
          </View>
          {!isPaired ? (
            !isBluetoothReady ? (
              <Text style={styles.emptyText}>请先打开系统蓝牙后再扫描设备</Text>
            ) : showScanning ? (
              <FlatList
                data={devices}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    正在搜索 EST_BLUE 设备...
                  </Text>
                }
                renderItem={({ item }) => renderDeviceItem(item)}
              />
            ) : (
              <Text style={styles.emptyText}>点击右上角开始扫描</Text>
            )
          ) : (
            <FlatList
              data={pairedDevices}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                pairedDevices.length > 0 ? (
                  <Text style={styles.deviceHint}>长按设备可移除配对</Text>
                ) : null
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  连接成功的主机会自动出现在这里
                </Text>
              }
              renderItem={({ item }) =>
                renderDeviceItem(item, () => handleRemovePaired(item))
              }
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
          <Text style={styles.openSettingsText}>打开设置</Text>
        </Pressable>
      </View>
    </View>
  );
}
