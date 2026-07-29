import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.sm,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  modelName: {
    color: colors.textMuted,
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  stepCounterButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: '#dbeafe',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  stepCounterButtonPressed: {
    opacity: 0.85,
  },
  stepCounter: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: '#dbeafe',
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconButtonActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#a5b4fc',
  },
  iconButtonPressed: {
    opacity: 0.85,
  },
  progressTrack: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    flexDirection: 'row',
    height: 4,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
});
