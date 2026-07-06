import { StyleSheet } from 'react-native';

import { colors } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
  },
  canvas: {
    flex: 1,
    minWidth: 0,
  },
});
