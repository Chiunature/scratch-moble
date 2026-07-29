import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../../../theme';
import { PLI_THUMBNAIL_HEIGHT } from '../layout/measurePliItem';

export const styles = StyleSheet.create({
  annotation: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
    marginTop: 4,
  },
  cardContent: {
    padding: spacing.sm,
    position: 'absolute',
  },
  cardSurface: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.sm,
    position: 'absolute',
  },
  container: {
    gap: spacing.sm,
  },
  stage: {
    position: 'relative',
  },
  grid: {
    overflow: 'hidden',
    position: 'relative',
  },
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  loadingText: {
    color: colors.textSubtle,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  hiddenSwatch: {
    opacity: 0,
  },
  label: {
    color: colors.textSubtle,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  partSwatch: {
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    height: 52,
    shadowColor: '#0f172a',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    width: 74,
  },
  quantity: {
    backgroundColor: colors.ink,
    borderRadius: 999,
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    lineHeight: 15,
    marginTop: 3,
  },
  thumbnailSlot: {
    alignItems: 'center',
    height: PLI_THUMBNAIL_HEIGHT,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    position: 'relative',
  },
  title: {
    color: colors.ink,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
    lineHeight: 17,
  },
});