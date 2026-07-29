import { StyleSheet } from 'react-native';

import { colors } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  stage: {
    flex: 1,
    flexDirection: 'row',
  },
  canvas: {
    flex: 1,
  },
});
