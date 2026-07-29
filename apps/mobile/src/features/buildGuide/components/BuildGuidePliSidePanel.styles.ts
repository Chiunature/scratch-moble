import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../../theme';

/** 横屏主视图左侧 PLI 栏宽度 */
export const PLI_SIDE_PANEL_WIDTH = 200;

export const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRightColor: '#e2e8f0',
    borderRightWidth: StyleSheet.hairlineWidth,
    flexGrow: 0,
    flexShrink: 0,
    width: PLI_SIDE_PANEL_WIDTH,
  },
  emptyText: {
    color: colors.textFaint,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
});
