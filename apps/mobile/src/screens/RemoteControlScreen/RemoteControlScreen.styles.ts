import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
    backgroundColor: colors.surface,
  },
  statusLine: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  statusLineStrong: {
    color: colors.ink,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  statusConnected: {
    color: '#2ecc71',
  },
  statusDisconnected: {
    color: '#e74c3c',
  },
  scrollBody: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  },
  portCard: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
  },
  portCardTitle: {
    color: colors.ink,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  portCardBody: {
    color: colors.textMuted,
    fontFamily: 'monospace',
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  jsonBlock: {
    padding: spacing.sm,
    borderRadius: spacing.sm,
    backgroundColor: colors.codeBackground,
    marginBottom: spacing.md,
  },
  jsonText: {
    color: colors.codeText,
    fontFamily: 'monospace',
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
});
