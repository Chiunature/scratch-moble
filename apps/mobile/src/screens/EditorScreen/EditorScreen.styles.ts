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
  headerProjectTitleWrap: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  headerProjectTitle: {
    color: colors.ink,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  headerProjectError: {
    marginTop: 2,
    color: '#dc2626',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
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
  deviceButton: {
    minWidth: 28,
    height: 28,
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceIconGrid: {
    width: 16,
    height: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    justifyContent: 'center',
    alignContent: 'center',
  },
  deviceIconDot: {
    width: 5,
    height: 5,
    borderRadius: 2,
    backgroundColor: colors.primary,
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
  projectLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  projectLoadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    gap: spacing.sm,
  },
  projectLoadingText: {
    color: colors.textSubtle,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  sidePanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    borderRadius: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.codeBackground,
    overflow: 'hidden',
  },
  sidePanelActiveButton: {
    backgroundColor: colors.background,
    borderRadius: spacing.sm,
  },
});
