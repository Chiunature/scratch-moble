import { StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: spacing['3xl'],
    backgroundColor: colors.background,
  },
  title: {
    color: colors.ink,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.black,
  },
  body: {
    maxWidth: 560,
    color: colors.textMuted,
    fontSize: fontSize.lg,
    lineHeight: 28,
    textAlign: 'center',
  },
});
