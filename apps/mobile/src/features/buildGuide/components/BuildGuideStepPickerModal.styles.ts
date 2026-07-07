import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
  },
  closeButton: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  stepButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: '#dbeafe',
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    minWidth: 48,
    paddingHorizontal: spacing.sm,
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
