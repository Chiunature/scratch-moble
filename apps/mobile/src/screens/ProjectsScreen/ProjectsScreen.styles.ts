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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  backButton: {
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    ...shadows.primarySm,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
  },
  title: {
    color: colors.ink,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  card: {
    borderRadius: 24,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    ...shadows.primaryMd,
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  newCard: {
    borderWidth: 2,
    borderColor: colors.primarySoft,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
  },
  cardMeta: {
    marginTop: spacing.sm,
    color: colors.textSubtle,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  emptyHint: {
    textAlign: 'center',
    color: colors.textFaint,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginTop: spacing.md,
  },
  headerSpacer: {
    width: 64,
  },
  renameBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  renameSheet: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    gap: spacing.md,
  },
  renameInput: {
    borderWidth: 1,
    borderColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
  },
  renameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  renameSaveText: {
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
