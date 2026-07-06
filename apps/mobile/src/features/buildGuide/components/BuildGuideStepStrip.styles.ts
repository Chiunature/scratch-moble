import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSubtle,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: '#dbeafe',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
  },
  stepButtonComplete: {
    backgroundColor: '#eef2ff',
    borderColor: colors.primarySoft,
  },
  stepButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepButtonPressed: {
    opacity: 0.88,
  },
  stepButtonText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  stepButtonTextComplete: {
    color: colors.primary,
  },
  stepButtonTextActive: {
    color: colors.surface,
  },
});
