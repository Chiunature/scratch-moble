import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { ScrollablePanel } from '../../components/ScrollablePanel';
import type { WatchDeviceItem } from '../../services/ble';
import { useBleStore } from '../../store/useBleStore';
import { styles } from './RemoteControlScreen.styles';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour12: false });
}

function formatPortPayload(item: WatchDeviceItem): string {
  const payload = { ...item };
  delete payload.port;
  delete payload.sensing_device;
  delete payload.deviceId;
  return JSON.stringify(payload, null, 2);
}

export function RemoteControlScreen() {
  const bluetoothState = useBleStore(state => state.bluetoothState);
  const connectionStatus = useBleStore(state => state.connectionStatus);
  const connectedDevice = useBleStore(state => state.connectedDevice);
  const deviceWatch = useBleStore(state => state.deviceWatch);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (deviceWatch) {
      setLastUpdatedAt(new Date());
    }
  }, [deviceWatch]);

  const rawJson = useMemo(() => {
    if (!deviceWatch) {
      return null;
    }
    try {
      return JSON.stringify(deviceWatch, null, 2);
    } catch {
      return String(deviceWatch);
    }
  }, [deviceWatch]);

  const isConnected = connectionStatus === 'connected';

  return (
    <View style={styles.root}>
      <View style={styles.statusBar}>
        <Text style={styles.statusLine}>
          蓝牙：
          <Text style={styles.statusLineStrong}>
            {bluetoothState ?? '检测中…'}
          </Text>
        </Text>
        <Text style={styles.statusLine}>
          连接：
          <Text
            style={[
              styles.statusLineStrong,
              isConnected ? styles.statusConnected : styles.statusDisconnected,
            ]}
          >
            {isConnected
              ? `${connectedDevice?.name ?? '已连接'} (${connectedDevice?.id ?? '-'})`
              : '未连接'}
          </Text>
        </Text>
        <Text style={styles.statusLine}>
          端口数：
          <Text style={styles.statusLineStrong}>
            {deviceWatch?.deviceList.length ?? 0}
          </Text>
          {lastUpdatedAt ? (
            <Text style={styles.statusLine}>
              {' '}
              · 更新 {formatTime(lastUpdatedAt)}
            </Text>
          ) : null}
        </Text>
      </View>

      <ScrollablePanel style={styles.scrollBody}>
        {!deviceWatch ? (
          <Text style={styles.emptyHint}>
            暂无主机数据。请先在「蓝牙设备」页连接 Spark_AI，连接成功后会自动开启
            sensing_update 监控；数据经 Notify 推送到此处（测试用）。
            {'\n\n'}
            注意：主机运行用户程序期间不会推送 Notify，程序暂停或结束后才会恢复。
          </Text>
        ) : (
          <>
            <Text style={styles.sectionTitle}>端口明细</Text>
            {deviceWatch.deviceList.map((item, index) => (
              <View key={`port-${item.port ?? index}`} style={styles.portCard}>
                <Text style={styles.portCardTitle}>
                  端口 {item.port ?? index} · {item.sensing_device ?? 'unknown'}{' '}
                  ({String(item.deviceId ?? '-')})
                </Text>
                <Text style={styles.portCardBody} selectable>
                  {formatPortPayload(item)}
                </Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>原始 JSON</Text>
            <View style={styles.jsonBlock}>
              <Text style={styles.jsonText} selectable>
                {rawJson}
              </Text>
            </View>
          </>
        )}
      </ScrollablePanel>
    </View>
  );
}
