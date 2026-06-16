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

// PikaScript 编译/运行操作区（轨道 A）
export const pikaActionStyles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: colors.primarySoft,
  },
  actionButtonUpload: {
    marginTop: spacing.xs,
    flex: undefined,
    width: '100%',
  },
  slotRow: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  slotLabel: {
    color: colors.primarySoft,
    fontSize: fontSize.xs,
  },
  slotControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slotButton: {
    width: 36,
    height: 36,
    borderRadius: spacing.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotButtonText: {
    color: colors.surface,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.lg,
  },
  slotValue: {
    flex: 1,
    textAlign: 'center',
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  statusText: {
    color: colors.primarySoft,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  statusError: {
    color: '#ff6b6b',
  },
  statusSuccess: {
    color: '#7dffb2',
  },
});
