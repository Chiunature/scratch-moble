import React, { memo, useRef } from 'react';
import { Animated, Image, Pressable, Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import type { BleDevice } from '../../../services/ble';
import bleDeviceImage from '../../../../assets/bleDevicesScreen/bluetooth-black.png';
import bleDeviceImageConnected from '../../../../assets/bleDevicesScreen/bluetooth-white.png';
import { styles } from '../BleDevicesScreen.styles';

type Props = {
  /** 列表行对应的 BLE 设备 */
  item: BleDevice;
  /** 是否为当前已连接的设备 */
  isConnected: boolean;
  /** 是否处于「已配对」Tab（控制在线角标是否展示） */
  isPairedTab: boolean;
  /** 设备是否在扫描范围内（已配对 Tab 用于显示在线/离线） */
  isOnline: boolean;
  /** 扫描到的最新设备信息，用于展示 RSSI 等实时数据 */
  scanned?: BleDevice;
  /** 是否禁用点击（如连接进行中时） */
  disabled?: boolean;
  /** 点击行时的回调 */
  onPress: () => void;
  /** 长按行时的回调（已配对 Tab 用于移除配对） */
  onLongPress?: () => void;
};

export const DeviceListItem = memo(function DeviceListItem({
  item,
  isConnected,
  isPairedTab,
  isOnline,
  scanned,
  disabled = false,
  onPress,
  onLongPress,
}: Props) {
  const { t } = useTranslation('ble');
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const animateTo = (scale: number, opacity: number) => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: scale,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(opacityAnim, {
        toValue: opacity,
        useNativeDriver: true,
        speed: 50,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) {
          animateTo(0.97, 0.78);
        }
      }}
      onPressOut={() => animateTo(1, 1)}
    >
      <Animated.View
        style={[
          styles.deviceItem,
          isConnected && styles.deviceItemConnected,
          disabled && styles.deviceItemDisabled,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={isConnected ? bleDeviceImageConnected : bleDeviceImage}
          style={styles.bleDeviceImage}
        />
        <View style={styles.deviceMetaContainer}>
          <Text
            style={[
              styles.deviceName,
              isConnected && styles.deviceNameConnected,
            ]}
          >
            {item.name}
          </Text>
          <Text
            style={[
              styles.deviceMeta,
              isConnected && styles.deviceMetaConnected,
            ]}
          >
            {item.id}
            {scanned?.rssi != null ? ` · ${scanned.rssi} dBm` : ''}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
});
