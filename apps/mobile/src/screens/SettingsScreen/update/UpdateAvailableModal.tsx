import { useCallback } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import type { UpdateAvailableModalView } from './UpdateAvailableModal.types';
import { styles } from './UpdateAvailableModal.styles';
import closeIcon from '../../../../assets/notifications/delete.png';
import updateIcon from '../../../../assets/notifications/update.png';
import downloadIcon from '../../../../assets/notifications/download.png';

type Props = {
  visible: boolean;
  view: UpdateAvailableModalView | null;
  downloading: boolean;
  onClose: () => void;
  onDownload: () => void;
  onLater: () => void;
};

const MODAL_VERTICAL_MARGIN = 48;
const MIN_MODAL_MAX_HEIGHT = 1;

/**
 * 纯展示组件：不持有业务状态，只渲染 view-model 并转发用户回调。
 * 数据来源（远程 API / BLE 固件 / mock）由逻辑层决定，本组件无感知。
 */
export const UpdateAvailableModal = ({
  visible,
  view,
  downloading,
  onClose,
  onDownload,
  onLater,
}: Props) => {
  const { t } = useTranslation('settings');
  const { height: windowHeight } = useWindowDimensions();
  //模型高度在最小高度和窗口高度之间取最大值
  const modalMaxHeight = Math.max(
    MIN_MODAL_MAX_HEIGHT,
    windowHeight - MODAL_VERTICAL_MARGIN,
  );

  const handleClose = useCallback(() => {
    if (!downloading) {
      onClose();
    }
  }, [downloading, onClose]);

  if (!visible || view === null) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={handleClose} />
        <View style={[styles.card, { maxHeight: modalMaxHeight }]}>
          <Pressable
            style={styles.closeButton}
            onPress={handleClose}
            disabled={downloading}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('updateModal.close')}
          >
            <Image
              source={closeIcon}
              style={styles.closeIcon}
              tintColor="rgb(27, 122, 246)"
            />
          </Pressable>

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.iconWrap}>
              <Image source={updateIcon} style={styles.updateIcon} />
            </View>

            <Text style={styles.title}>{t('updateModal.title')}</Text>
            <Text style={styles.versionLine}>
              {t('updateModal.versionLine', {
                current: view.currentVersion,
                latest: view.latestVersion,
              })}
            </Text>

            <View style={styles.changelogSection}>
              <Text style={styles.changelogTitle}>
                {t('updateModal.changelogTitle')}
              </Text>
              {view.changelog.map((item, index) => (
                <View key={index} style={styles.changelogItem}>
                  <View style={styles.changelogDot} />
                  <Text style={styles.changelogText}>{item}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.laterButton,
                pressed && styles.buttonPressed,
                downloading && styles.laterButtonDisabled,
              ]}
              onPress={onLater}
              disabled={downloading}
              accessibilityRole="button"
              accessibilityLabel={t('updateModal.later')}
            >
              <Text style={styles.laterButtonText} numberOfLines={1}>
                {t('updateModal.later')}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.downloadButton,
                pressed && styles.buttonPressed,
                downloading && styles.downloadButtonDisabled,
              ]}
              onPress={onDownload}
              disabled={downloading}
              accessibilityRole="button"
              accessibilityLabel={t('updateModal.download')}
            >
              <Image source={downloadIcon} style={styles.downloadIcon} />
              <Text style={styles.downloadButtonText} numberOfLines={1}>
                {downloading
                  ? t('updateModal.downloading')
                  : t('updateModal.download')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
