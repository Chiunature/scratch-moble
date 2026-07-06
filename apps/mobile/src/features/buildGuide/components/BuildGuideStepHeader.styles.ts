import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modelName: {
    color: colors.textMuted,
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    marginRight: spacing.sm,
  },
  stepCounter: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
  },
  progressTrack: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    flexDirection: 'row',
    height: 6,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  stepTitle: {
    color: colors.ink,
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
  },
  stepDescription: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    lineHeight: 20,
  },
});
