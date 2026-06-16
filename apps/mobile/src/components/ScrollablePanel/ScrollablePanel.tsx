import React from 'react';
import {
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type ScrollablePanelProps = ScrollViewProps & {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/** 带可见垂直滚动条的侧栏/面板容器 */
export function ScrollablePanel({
  children,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = true,
  nestedScrollEnabled = true,
  keyboardShouldPersistTaps = 'handled',
  ...rest
}: ScrollablePanelProps) {
  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      nestedScrollEnabled={nestedScrollEnabled}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: 8,
    paddingBottom: 24,
  },
});
