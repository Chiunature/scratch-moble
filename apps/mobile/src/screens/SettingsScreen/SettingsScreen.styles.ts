import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, shadows, spacing } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing['2xl'],
  },
  scrollView: {
    flex: 1,
    borderRadius: 28,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    borderRadius: 28,
    padding: 15,
  },
  backIcon: {
    width: 28,
    height: 20,
    tintColor: colors.primary,
  },
  headerTitle: {
    color: colors.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.black,
  },
  panel: {
    borderRadius: 28,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.xs,
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
  updateEntry: {
    borderRadius: 16,
  },
  updateEntryPressed: {
    opacity: 0.6,
  },
  helpIcon: {
    width: 16,
    height: 16,
  },
});
