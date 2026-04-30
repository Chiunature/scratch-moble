import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, shadows, spacing } from '../../theme';

export const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  loadingLogo: {
    width: 120,
    height: 120,
  },
  loadingText: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
    backgroundColor: colors.background,
  },
  header: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing['2xl'],
    right: spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 76,
    height: 76,
  },
  settingsButton: {
    borderRadius: 999,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    ...shadows.primarySm,
  },
  settingsText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  card: {
    width: 170,
    height: 132,
    justifyContent: 'center',
    borderRadius: 26,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    ...shadows.primaryMd,
  },
  cardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  cardTitle: {
    color: colors.ink,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
  },
  cardSubtitle: {
    marginTop: spacing.xs,
    color: colors.textSubtle,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  appName: {
    position: 'absolute',
    bottom: 22,
    color: colors.textFaint,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
});
