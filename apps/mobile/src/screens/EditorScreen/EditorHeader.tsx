import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@scratch-mobile/i18n';
import type { PikaActionState } from '../../features/editor';

import { styles } from './EditorScreen.styles';
import { colors } from '../../theme';
import { BatteryStatusLight } from './BatteryStatusLight';
import HomeIcon from '../../../assets/editorScreen/home.png';
import CodeViewIcon from '../../../assets/editorScreen/codeView.png';
import RunIcon from '../../../assets/editorScreen/run.png';
import PauseIcon from '../../../assets/editorScreen/pause.png';
import DownloadIcon from '../../../assets/editorScreen/download.png';

type HostToolbarAction = 'run' | 'download' | 'pause';

type Props = {
  title: string;
  error: string | null;
  canHostAction: boolean;
  pikaAction: PikaActionState;
  activeHostAction: HostToolbarAction | null;
  programSlot: number;
  isCodePanelOpen: boolean;
  isSensorPanelOpen: boolean;
  onBack: () => void;
  onRunOnHost: () => void;
  onPauseHost: () => void;
  onDownloadToHost: () => void;
  onOpenSlotPicker: () => void;
  onToggleCodePanel: () => void;
  onToggleSensorPanel: () => void;
};

export function EditorHeader({
  title,
  error,
  canHostAction,
  pikaAction,
  activeHostAction,
  programSlot,
  isCodePanelOpen,
  isSensorPanelOpen,
  onBack,
  onRunOnHost,
  onPauseHost,
  onDownloadToHost,
  onOpenSlotPicker,
  onToggleCodePanel,
  onToggleSensorPanel,
}: Props) {
  const { t } = useTranslation('editorShell');
  const insets = useSafeAreaInsets();
  const isPikaBusy = pikaAction !== 'idle';

  return (
    <View style={[styles.editorHeader, { paddingTop: insets.top }]}>
      <Pressable
        style={styles.headerPressable}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t('toolbar.back')}
      >
        <Image source={HomeIcon} style={styles.headerIcon} />
      </Pressable>
      <View style={styles.headerProjectTitleWrap}>
        <Text style={styles.headerProjectTitle} numberOfLines={1}>
          {title}
        </Text>
        {error ? (
          <Text style={styles.headerProjectError} numberOfLines={1}>
            {error}
          </Text>
        ) : null}
      </View>
      <BatteryStatusLight />
      <View style={styles.headerHostActions}>
        <Pressable
          style={[
            styles.hostActionButton,
            !canHostAction && styles.hostActionButtonDisabled,
          ]}
          disabled={!canHostAction}
          onPress={onRunOnHost}
          accessibilityRole="button"
          accessibilityLabel={t('toolbar.runOnHost')}
        >
          {activeHostAction === 'run' && isPikaBusy ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Image source={RunIcon} style={styles.hostActionIcon} />
          )}
        </Pressable>
        <Pressable
          style={[
            styles.hostActionButton,
            !canHostAction && styles.hostActionButtonDisabled,
          ]}
          disabled={!canHostAction}
          onPress={onPauseHost}
          accessibilityRole="button"
          accessibilityLabel={t('toolbar.pauseHost')}
        >
          {activeHostAction === 'pause' && isPikaBusy ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Image source={PauseIcon} style={styles.hostActionIcon} />
          )}
        </Pressable>
        <Pressable
          style={[
            styles.hostActionButton,
            !canHostAction && styles.hostActionButtonDisabled,
          ]}
          disabled={!canHostAction}
          onPress={onDownloadToHost}
          accessibilityRole="button"
          accessibilityLabel={t('toolbar.downloadToHost')}
        >
          {activeHostAction === 'download' && isPikaBusy ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Image source={DownloadIcon} style={styles.hostActionIcon} />
          )}
        </Pressable>
      </View>
      <View style={styles.headerContent}>
        <Pressable
          style={styles.slotBadgeButton}
          onPress={onOpenSlotPicker}
          accessibilityRole="button"
          accessibilityLabel={t('toolbar.programSlot', { slot: programSlot })}
        >
          <Text style={styles.slotBadgeText}>{programSlot}</Text>
        </Pressable>
        <Pressable
          style={[
            styles.deviceButton,
            isSensorPanelOpen && styles.sidePanelActiveButton,
          ]}
          onPress={onToggleSensorPanel}
          accessibilityRole="button"
          accessibilityLabel={t('toolbar.sensorStatus')}
          accessibilityState={{ expanded: isSensorPanelOpen }}
        >
          <View style={styles.deviceIconGrid}>
            {[0, 1, 2, 3].map(index => (
              <View key={index} style={styles.deviceIconDot} />
            ))}
          </View>
        </Pressable>
        <Pressable
          style={[
            styles.headerPressable,
            isCodePanelOpen && styles.sidePanelActiveButton,
          ]}
          onPress={onToggleCodePanel}
          accessibilityRole="button"
          accessibilityLabel={t('toolbar.codePreview')}
          accessibilityState={{ expanded: isCodePanelOpen }}
        >
          <Image source={CodeViewIcon} style={styles.headerIcon} />
        </Pressable>
      </View>
    </View>
  );
}