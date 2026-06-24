import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScrollablePanel } from '../../components/ScrollablePanel';
import { colors, fontSize } from '../../theme';

type GeneratedCodePanelProps = {
  code: string;
};

export function GeneratedCodePanel({ code }: GeneratedCodePanelProps) {
  const lines = code.split('\n');

  return (
    <ScrollablePanel style={styles.panel} nestedScrollEnabled>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.codeScrollContent}
      >
        <View style={styles.codeBlock}>
          {lines.map((line, index) => (
            <Text key={`code-line-${index}`} style={styles.codeLine} selectable>
              {line.length > 0 ? line : ' '}
            </Text>
          ))}
        </View>
      </ScrollView>
    </ScrollablePanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
  },
  codeScrollContent: {
    flexGrow: 1,
  },
  codeBlock: {
    flexDirection: 'column',
  },
  codeLine: {
    flexShrink: 0,
    color: colors.codeText,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: fontSize.xs,
    lineHeight: 20,
  },
});
