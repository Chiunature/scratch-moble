import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
  },
  compactContainer: {
    flexDirection: 'column',
  },
  editorPanel: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: spacing.xl,
    backgroundColor: colors.surface,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  codePanel: {
    width: 280,
    gap: spacing.xs,
    borderRadius: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.codeBackground,
  },
  compactCodePanel: {
    width: '100%',
    maxHeight: 260,
  },
  codeTitle: {
    color: colors.surface,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
  },
  meta: {
    color: colors.primarySoft,
    fontSize: fontSize.xs,
  },
  code: {
    flex: 1,
    color: colors.codeText,
    fontFamily: 'monospace',
    fontSize: fontSize.xs,
    lineHeight: 20,
  },
});
