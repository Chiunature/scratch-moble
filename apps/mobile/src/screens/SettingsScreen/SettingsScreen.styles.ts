import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, shadows, spacing } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing['2xl'],
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
  },
  panel: {
    borderRadius: 28,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    ...shadows.primaryMd,
  },
  panelTitle: {
    color: colors.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.black,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#dbeafe',
    gap: spacing.lg,
  },
  sectionFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  sectionLabel: {
    width: 88,
    color: colors.ink,
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
    lineHeight: 24,
  },
  sectionContent: {
    flex: 1,
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkboxMark: {
    color: colors.surface,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    lineHeight: 14,
  },
  languageLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  languageLabelSelected: {
    color: colors.ink,
  },
  versionText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    lineHeight: 22,
  },
  infoText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    lineHeight: 22,
  },
});
