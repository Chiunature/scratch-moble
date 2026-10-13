import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, shadows, spacing } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  heading: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.ink,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.black,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: 2,
  },
  headerButton: {
    minHeight: 44,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  settingsButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    ...shadows.primarySmall,
  },
  settingsButtonText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  infoCard: {
    borderRadius: 18,
    backgroundColor: '#e0e7ff',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  infoTitle: {
    color: '#312e81',
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
  },
  infoText: {
    color: '#3730a3',
    fontSize: fontSize.sm,
    lineHeight: 21,
    marginTop: 4,
  },
  projectScroll: {
    flex: 1,
  },
  projectGrid: {
    flexGrow: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  projectCard: {
    flexGrow: 1,
    flexBasis: 280,
    minHeight: 100,
    maxWidth: 560,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadows.primarySmall,
  },
  projectCardPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  projectIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectIconText: {
    color: colors.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.black,
  },
  projectCopy: {
    flex: 1,
    minWidth: 0,
  },
  projectName: {
    color: colors.ink,
    fontSize: fontSize.md,
    lineHeight: 22,
    fontWeight: fontWeight.extraBold,
  },
  projectMeta: {
    color: colors.textSubtle,
    fontSize: fontSize.xs,
    marginTop: 5,
  },
  projectArrow: {
    color: colors.primary,
    fontSize: 32,
    lineHeight: 34,
  },
  centerState: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    textAlign: 'center',
  },
  centerText: {
    color: colors.textSubtle,
    fontSize: fontSize.sm,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  errorCard: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    padding: spacing.md,
  },
  errorTitle: {
    color: '#991b1b',
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
  },
  errorText: {
    color: '#991b1b',
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: 4,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  retryText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  pressed: {
    opacity: 0.7,
  },
});