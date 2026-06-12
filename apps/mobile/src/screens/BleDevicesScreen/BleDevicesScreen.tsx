import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { State } from 'react-native-ble-plx';

import backIcon from '../../../assets/bleDevicesScreen/back.png';
import {
  type BleDevice,
  startScan,
  stopScan,
  subscribeBluetoothState,
} from '../../services/ble';
import { styles } from './BleDevicesScreen.styles';
import bleLogo from '../../../assets/homeScreen/bleIcon.png';
import { RippleEffect } from './components/RippleRing';
const bluetoothStateLabel: Record<string, string> = {
  PoweredOn: '蓝牙已开启',
  PoweredOff: '蓝牙已关闭',
  Unauthorized: '未授权',
  Unsupported: '不支持蓝牙',
  Resetting: '重置中',
  Unknown: '未知',
};

export function BleDevicesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [bluetoothState, setBluetoothState] = useState<State | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [pairedDevices, setPairedDevices] = useState<BleDevice[]>([]);
  const [isPaired, setIsPaired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeBluetoothState(setBluetoothState);
    return () => {
      unsubscribe();
      stopScan();
    };
  }, []);

  const upsertDevice = useCallback((device: BleDevice) => {
    setDevices(prev => {
      //检查当前设备列表的id是否有存在一样的id，如果有，则更新，如果没有，则新增
      const index = prev.findIndex(item => item.id === device.id);
      // 没找到一样的id，则新增
      if (index === -1) {
        return [...prev, device];
      }
      // 找到一样的id，则更新
      const next = [...prev];
      next[index] = device;
      return next;
    });
  }, []);

  const handleScan = async () => {
    if (isScanning) {
      stopScan();
      setIsScanning(false);
      return;
    }

    setErrorMessage(null);
    setDevices([]);

    try {
      await startScan(upsertDevice);
      setIsScanning(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '扫描失败');
      setIsScanning(false);
    }
  };

  const changeIsPaired = (isPaired: boolean) => {
    setIsPaired(isPaired);
  };
  const stateLabel =
    bluetoothState != null
      ? bluetoothStateLabel[bluetoothState] ?? bluetoothState
      : '检测中...';

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Image source={backIcon} style={styles.backIcon} />
        </Pressable>
        <Text style={styles.headerTitle}>蓝牙设备</Text>
        <Pressable
          style={[
            styles.scanButton,
            {
              backgroundColor: isScanning ? '#007aff' : 'transparent',
              borderWidth: 1,
              borderColor: isScanning ? '#007aff' : '#e0e0e0',
            },
          ]}
          onPress={handleScan}
        >
          <Text
            style={[
              styles.scanButtonText,
              { color: isScanning ? '#ffffff' : '#007aff' },
            ]}
          >
            {isScanning ? '停止扫描' : '开始扫描'}
          </Text>
        </Pressable>
      </View>
      <View style={styles.container}>
        <View style={styles.statusContainer}>
          <View style={styles.bleLogoContainer}>
            <RippleEffect active={isScanning} />
            <View style={styles.bleLogoInnerContainer}>
              <Image source={bleLogo} style={styles.bleLogo} />
            </View>
            <View style={styles.scanningStatusContainer}>
              <Text style={{ color: '#a7aeb9', fontSize: 12 }}>
                {isScanning ? '正在扫描...' : '扫描已暂停'}
              </Text>
              {isScanning && (
                <Text
                  style={{ color: '#333', fontWeight: '900', fontSize: 16 }}
                >
                  发现{devices.length}个设备
                </Text>
              )}
            </View>
          </View>
          <View style={styles.connectStatusContainer}>
            <Text>123</Text>
          </View>
        </View>
        <View style={styles.listContentContainer}>
          <View style={styles.listHeader}>
            <Pressable
              style={[
                styles.listHeaderButton,
                isPaired
                  ? {}
                  : { borderBottomWidth: 1, borderBottomColor: '#007aff' },
              ]}
              onPress={() => {
                changeIsPaired(false);
              }}
            >
              <Text style={styles.listHeaderButtonText}>可用设备</Text>
            </Pressable>
            <Pressable
              style={[
                styles.listHeaderButton,
                isPaired
                  ? { borderBottomWidth: 1, borderBottomColor: '#007aff' }
                  : {},
              ]}
              onPress={() => {
                changeIsPaired(true);
              }}
            >
              <Text style={styles.listHeaderButtonText}>已配对</Text>
            </Pressable>
          </View>
          {!isPaired && isScanning ? (
            <FlatList
              data={devices}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.deviceItem}>
                  <Text style={styles.deviceName}>{item.name}</Text>
                  <Text style={styles.deviceMeta}>
                    {item.id}
                    {item.rssi != null ? ` · ${item.rssi} dBm` : ''}
                  </Text>
                </View>
              )}
            />
          ) : null}
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.statusText}>{stateLabel}</Text>
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </View>
    </View>
  );
}
