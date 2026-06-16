import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../theme';
import { memo } from 'react';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: '#fefeff',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb99',
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: fontWeight.black,
  },
  scanButton: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  scanButtonText: {
    fontSize: 12,
    fontWeight: fontWeight.extraBold,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fafcfd',
  },
  statusContainer: {
    flex: 3,
    borderRightWidth: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderRightColor: '#e5e7eb99',
  },
  bleLogoContainer: {
    flex: 0.75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bleLogoInnerContainer: {
    borderRadius: '50%',
    backgroundColor: '#007aff',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  bleLogo: { width: 32, height: 32 },
  scanningStatusContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  connectStatusContainer: {
    flex: 0.25,
    borderWidth: 1,
    borderColor: '#e5e7eb99',
    boxShadow: '0 0 3px 0 rgba(0, 0, 0, 0.1)',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: '#fefeff',
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  listContentContainer: { flex: 7 },
  listHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb99',
    backgroundColor: '#fefeff',
    boxShadow: '0 0 3px 0 rgba(0, 0, 0, 0.1)',
  },
  listHeaderButton: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  listHeaderButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  statusText: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb99',
    backgroundColor: '#fefeff',
    padding: spacing.xs,
  },
  footerStatusText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    padding: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: '#dc2626',
  },
  openSettingsButton: {
    borderRadius: 60,
    backgroundColor: '#f4f4f6',
    padding: spacing.xs,
  },
  openSettingsText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: fontSize.sm,
    color: colors.textSubtle,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.xs,
    boxShadow: '0 0 3px 0 rgba(0, 0, 0, 0.1)',
  },
  deviceItemConnected: {
    backgroundColor: '#007aff',
    borderColor: '#007aff',
  },
  deviceNameConnected: {
    color: '#ffffff',
  },
  deviceMetaConnected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  onlineBadgeConnected: {
    color: '#ffffff',
  },
  deviceHintConnected: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  bleDeviceImage: {
    borderRadius: 999,
    width: 40,
    height: 40,
  },
  deviceMetaContainer: {
    flex: 1,
    gap: 5,
    flexDirection: 'column',
  },
  deviceName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: colors.ink,
  },
  deviceMeta: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
  },
  deviceHint: {
    position: 'absolute',
    right: 0,
    fontSize: fontSize.xs,
    color: colors.textFaint,
  },
  onlineBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    fontSize: fontSize.xs,
    color: '#007aff',
    fontWeight: fontWeight.bold,
  },
});
