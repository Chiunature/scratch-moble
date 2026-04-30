import { StyleSheet } from 'react-native';

import { fontSize, fontWeight, spacing } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  actions: {
    gap: spacing.sm,
  },
});
