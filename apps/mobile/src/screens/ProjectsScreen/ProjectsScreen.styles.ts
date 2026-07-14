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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing['3xl'],
  },
  listRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-end',
    borderRadius: 16,
    padding: 8,
    paddingTop: 28,
  },
  cardShadow: {
    ...shadows.primarySm,
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  newCard: {
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  newCardIcon: {
    color: colors.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.black,
    lineHeight: 26,
    marginBottom: 2,
  },
  moreButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 1,
    width: 26,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  moreButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  moreDots: {
    flexDirection: 'row',
    gap: 2,
  },
  moreDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.primary,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    lineHeight: 16,
  },
  cardMeta: {
    marginTop: 3,
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: fontWeight.bold,
    lineHeight: 12,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
