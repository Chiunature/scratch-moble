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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  slotBadgeButton: {
    minWidth: 32,
    height: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBadgeText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  headerHostActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  hostActionButton: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostActionButtonDisabled: {
    opacity: 0.35,
  },
  hostActionIcon: {
    width: 28,
    height: 28,
  },
  editorPanel: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  codePanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 280,
    borderRadius: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.codeBackground,
    overflow: 'hidden',
  },
  codePanelBody: {
    flex: 1,
  },
  codeSectionLabel: {
    color: colors.primarySoft,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xs,
  },
  codeBlock: {
    marginTop: spacing.xs,
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
    color: colors.codeText,
    fontFamily: 'monospace',
    fontSize: fontSize.xs,
    lineHeight: 20,
  },
});
