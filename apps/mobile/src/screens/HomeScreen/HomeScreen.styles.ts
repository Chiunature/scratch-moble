import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../theme';

export const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  loadingLogo: {
    width: 120,
    height: 120,
  },
  loadingText: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // 内边距在组件内根据安全区（刘海/状态栏/home 指示条）动态注入
  },
  header: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing['2xl'],
    right: spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',

    gap: 10,
  },
  settingsButton: {
    padding: spacing.xs,
  },
  settingIcon: { width: 28, height: 28 },
  cardRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.lg,
  },
  card: {
    aspectRatio: 1,
    justifyContent: 'center',
  },
  cardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  cardBackground: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: spacing.xs,
  },
  cardTitle: {
    color: colors.surface,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
  },
  cardSubtitle: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  appName: {
    position: 'absolute',
    bottom: 22,
    color: colors.textFaint,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  bluetoothButton: {
    padding: spacing.xs,
  },
  bluetoothIcon: {
    width: 28,
    height: 28,
  },
});
