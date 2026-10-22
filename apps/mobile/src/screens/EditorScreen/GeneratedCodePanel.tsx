import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ListRenderItem,
} from 'react-native';

import { colors, fontSize } from '../../theme';

type GeneratedCodePanelProps = {
  code: string;
};

type CodeLineProps = {
  line: string;
};

const CODE_LINE_HEIGHT = 20;
const ESTIMATED_CODE_CHAR_WIDTH = 8;
const INITIAL_RENDERED_LINES = 80;

const toGeneratedCodeLines = (code: string): string[] => code.split('\n');

const CodeLine = React.memo(function CodeLine({ line }: CodeLineProps) {
  return (
    <Text style={styles.codeLine} selectable>
      {line.length > 0 ? line : ' '}
    </Text>
  );
});

export const GeneratedCodePanel = React.memo(function GeneratedCodePanel({
  code,
}: GeneratedCodePanelProps) {
  const lines = useMemo(() => toGeneratedCodeLines(code), [code]);
  const estimatedContentWidth = useMemo(
    () =>
      lines.reduce(
        (maxWidth, line) =>
          Math.max(maxWidth, line.length * ESTIMATED_CODE_CHAR_WIDTH),
        1,
      ),
    [lines],
  );
  const renderItem = useCallback<ListRenderItem<string>>(
    ({ item }) => <CodeLine line={item} />,
    [],
  );
  const keyExtractor = useCallback(
    (_: string, index: number) => String(index),
    [],
  );
  const getItemLayout = useCallback(
    (_: ArrayLike<string> | null | undefined, index: number) => ({
      length: CODE_LINE_HEIGHT,
      offset: CODE_LINE_HEIGHT * index,
      index,
    }),
    [],
  );
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport(current =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  }, []);
  const listWidth = Math.max(estimatedContentWidth, viewport.width);

  return (
    <View style={styles.panel} onLayout={handleLayout}>
      {viewport.height > 0 ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator
          style={{ width: viewport.width, height: viewport.height }}
          contentContainerStyle={{ height: viewport.height }}
        >
          <FlatList
            data={lines}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            initialNumToRender={INITIAL_RENDERED_LINES}
            maxToRenderPerBatch={INITIAL_RENDERED_LINES}
            updateCellsBatchingPeriod={16}
            windowSize={9}
            removeClippedSubviews={Platform.OS !== 'web'}
            style={{ width: listWidth, height: viewport.height }}
            contentContainerStyle={styles.listContent}
          />
        </ScrollView>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  codeLine: {
    flexShrink: 0,
    color: colors.codeText,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: fontSize.xs,
    lineHeight: CODE_LINE_HEIGHT,
  },
});
