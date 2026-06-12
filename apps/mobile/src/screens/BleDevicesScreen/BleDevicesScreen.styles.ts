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
    borderColor: 'green',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'green',
    backgroundColor: '#fefeff',
  },
  statusText: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  errorText: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    fontSize: fontSize.sm,
    color: '#dc2626',
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  deviceName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  deviceMeta: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.textSubtle,
  },
});
