import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, shadows, spacing } from '../../theme';

/** Cover assets are authored at 200×200; keep display 1:1 to avoid upscaling blur. */
export const BUILD_GUIDE_COVER_SIZE = 200;

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
    ...shadows.primarySmall,
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
  headerSpacer: {
    width: 72,
  },
  listContent: {
    paddingTop: spacing.xs,
  },
  listRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
    justifyContent: 'flex-start',
  },
  itemSeparator: {
    height: spacing.sm,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing['2xl'],
  },
  card: {
    // borderWidth: 1,
    // borderColor: 'red',
    width: BUILD_GUIDE_COVER_SIZE,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingBottom: spacing.md,
    overflow: 'hidden',
  },
  cardCover: {
    width: '100%',
    height: BUILD_GUIDE_COVER_SIZE,
    backgroundColor: colors.surface,
  },
  cardShadow: {
    ...shadows.primarySmall,
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  cardTitle: {
    color: colors.ink,
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  actionButton: {
    // Grow to fill available space; when both buttons' natural (single-line)
    // widths exceed the row, flexWrap pushes the second onto a new line and
    // each button then spans the full width — side-by-side by default,
    // stacked vertically when the label text is too long.
    flexGrow: 1,
    flexBasis: 'auto',
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  actionButtonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonSecondaryText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
