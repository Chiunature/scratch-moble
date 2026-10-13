import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveProjectDisplayName } from '@scratch-mobile/i18n';

import { type RootStackParamList } from '../../app/navigation';
import { AssistantConnectionSettings } from '../../features/assistant/AssistantConnectionSettings';
import { useProjectStore } from '../../store/useProjectStore';
import { colors, spacing } from '../../theme';
import { styles } from './AiChatScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AiChat'>;
type AssistantEditorParams = RootStackParamList['Editor'] & { assistant: true };

export function AiChatScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const projects = useProjectStore(state => state.projects);
  const status = useProjectStore(state => state.status);
  const error = useProjectStore(state => state.error);
  const loadProjects = useProjectStore(state => state.loadProjects);
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => {
    loadProjects().catch(() => undefined);
  }, [loadProjects]);

  const handleSelectProject = useCallback(
    (projectId: string) => {
      const params: AssistantEditorParams = { projectId, assistant: true };
      navigation.navigate('Editor', params);
    },
    [navigation],
  );

  const refreshing = status === 'loading' && projects.length > 0;
  const initialLoading = status === 'loading' && projects.length === 0;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, spacing.md),
          paddingBottom: Math.max(insets.bottom, spacing.md),
          paddingLeft: Math.max(insets.left, spacing.lg),
          paddingRight: Math.max(insets.right, spacing.lg),
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="返回首页"
        >
          <Text style={styles.headerButtonText}>返回</Text>
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.title}>积木助手</Text>
          <Text style={styles.subtitle}>选择一个作品，在编辑器内审阅助手生成的修改</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
          onPress={() => setSettingsVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="打开模型配置"
        >
          <Text style={styles.settingsButtonText}>模型配置</Text>
        </Pressable>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>先选择作品</Text>
        <Text style={styles.infoText}>
          助手会在编辑器打开后读取实时工作区，并在发送前提示哪些上下文会交给第三方模型服务。候选代码会先编译验证，不会自动连接蓝牙或保存作品。
        </Text>
      </View>

      {initialLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>正在载入作品…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.projectScroll}
          contentContainerStyle={styles.projectGrid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadProjects().catch(() => undefined)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {status === 'error' ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>作品载入失败</Text>
              <Text style={styles.errorText}>{error || '请稍后重试。'}</Text>
              <Pressable
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
                onPress={() => loadProjects().catch(() => undefined)}
              >
                <Text style={styles.retryText}>重试</Text>
              </Pressable>
            </View>
          ) : null}

          {status !== 'error' && projects.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.emptyTitle}>还没有可用作品</Text>
              <Text style={styles.centerText}>请先返回作品页创建并保存一个作品，再使用积木助手。</Text>
            </View>
          ) : null}

          {projects.map(project => (
            <Pressable
              key={project.id}
              style={({ pressed }) => [styles.projectCard, pressed && styles.projectCardPressed]}
              onPress={() => handleSelectProject(project.id)}
              accessibilityRole="button"
              accessibilityLabel={`使用积木助手打开${resolveProjectDisplayName(project.name)}`}
            >
              <View style={styles.projectIcon}>
                <Text style={styles.projectIconText}>✦</Text>
              </View>
              <View style={styles.projectCopy}>
                <Text style={styles.projectName} numberOfLines={2}>
                  {resolveProjectDisplayName(project.name)}
                </Text>
                <Text style={styles.projectMeta}>{project.blockCount ?? 0} 个积木</Text>
              </View>
              <Text style={styles.projectArrow}>›</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <AssistantConnectionSettings
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}