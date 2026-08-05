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
    maxHeight: '88%',
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
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  sectionHint: {
    color: colors.textSubtle,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionChip: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1.5,
    minWidth: 76,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  optionChipSelected: {
    backgroundColor: '#eef2ff',
    borderColor: colors.primary,
  },
  optionChipPressed: {
    opacity: 0.88,
  },
  preview: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    marginBottom: 6,
  },
  optionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: colors.primary,
  },
});
