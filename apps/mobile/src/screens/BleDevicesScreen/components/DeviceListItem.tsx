import React, { useRef } from 'react';
import { Animated, Image, Pressable, Text, View } from 'react-native';

import type { BleDevice } from '../../../services/ble';
import bleDeviceImage from '../../../../assets/bleDevicesScreen/bluetooth-black.png';
import bleDeviceImageConnected from '../../../../assets/bleDevicesScreen/bluetooth-white.png';
import { styles } from '../BleDevicesScreen.styles';

type Props = {
  item: BleDevice;
  isConnected: boolean;
  isPairedTab: boolean;
  isOnline: boolean;
  scanned?: BleDevice;
  onPress: () => void;
  onLongPress?: () => void;
};

export function DeviceListItem({
  item,
  isConnected,
  isPairedTab,
  isOnline,
  scanned,
  onPress,
  onLongPress,
}: Props) {
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
      onPressIn={() => animateTo(0.97, 0.78)}
      onPressOut={() => animateTo(1, 1)}
    >
      <Animated.View
        style={[
          styles.deviceItem,
          isConnected && styles.deviceItemConnected,
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
}
