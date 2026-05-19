import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    // paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    justifyContent: 'flex-start',
    // borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor: colors.primarySoft,
  },
  headerPressable: {
    minWidth: 24,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 24,
    height: 24,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  editorPanel: {
    flex: 1,
    minHeight: 0,
  },
  codePanel: {
    position: 'absolute',
    width: 280,
    height: '100%',
    right: 0,
    gap: spacing.xs,
    borderRadius: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.codeBackground,
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
