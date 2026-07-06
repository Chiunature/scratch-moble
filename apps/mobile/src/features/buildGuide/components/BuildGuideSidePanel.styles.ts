import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../../theme';

export const BUILD_GUIDE_SIDE_PANEL_WIDTH = 300;

export const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderLeftColor: '#e2e8f0',
    borderLeftWidth: StyleSheet.hairlineWidth,
    flexDirection: 'column',
    paddingLeft: spacing.lg,
    paddingTop: spacing.md,
    width: BUILD_GUIDE_SIDE_PANEL_WIDTH,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  actions: {
    borderTopColor: '#e2e8f0',
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingTop: spacing.md,
  },
  hintText: {
    color: colors.textFaint,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    lineHeight: 18,
    textAlign: 'center',
  },
});
