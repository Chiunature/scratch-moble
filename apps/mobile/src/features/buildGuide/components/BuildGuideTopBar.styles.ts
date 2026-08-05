import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    // borderBottomColor: '#e2e8f0',
    // borderBottomWidth: StyleSheet.hairlineWidth,
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
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
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
  ratioText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});