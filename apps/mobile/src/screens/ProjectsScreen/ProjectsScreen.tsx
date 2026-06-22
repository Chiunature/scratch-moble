import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ScratchProjectSummary } from '@scratch-mobile/shared';
import { type RootStackParamList } from '../../app/navigation';
import { colors } from '../../theme';
import { useProjectStore } from '../../store/useProjectStore';
import { styles } from './ProjectsScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Projects'>;

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function ProjectsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const projects = useProjectStore(state => state.projects);
  const isLoading = useProjectStore(state => state.isLoading);
  const loadProjects = useProjectStore(state => state.loadProjects);
  const createAndTrack = useProjectStore(state => state.createAndTrack);
  const rename = useProjectStore(state => state.rename);
  const remove = useProjectStore(state => state.remove);
  const [isCreating, setIsCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ScratchProjectSummary | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleCreateProject = useCallback(async () => {
    if (isCreating) {
      return;
    }
    setIsCreating(true);
    try {
      const summary = await createAndTrack();
      navigation.navigate('Editor', { projectId: summary.id });
    } finally {
      setIsCreating(false);
    }
  }, [createAndTrack, isCreating, navigation]);

  const handleOpenProject = useCallback(
    (projectId: string) => {
      navigation.navigate('Editor', { projectId });
    },
    [navigation],
  );

  const handleLongPressProject = useCallback(
    (project: ScratchProjectSummary) => {
      Alert.alert(project.name, '选择操作', [
        {
          text: '重命名',
          onPress: () => {
            setRenameTarget(project);
            setRenameValue(project.name);
          },
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            Alert.alert('删除作品', `确定删除「${project.name}」吗？`, [
              { text: '取消', style: 'cancel' },
              {
                text: '删除',
                style: 'destructive',
                onPress: () => {
                  void remove(project.id);
                },
              },
            ]);
          },
        },
        { text: '取消', style: 'cancel' },
      ]);
    },
    [remove],
  );

  const renderProject = useCallback(
    ({ item }: { item: ScratchProjectSummary }) => (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => handleOpenProject(item.id)}
        onLongPress={() => handleLongPressProject(item)}
        accessibilityRole="button"
        accessibilityLabel={`打开作品 ${item.name}`}
      >
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardMeta}>
          更新于 {formatUpdatedAt(item.updatedAt)}
        </Text>
        <Text style={styles.cardMeta}>
          积木数量 {item.blockCount ?? 0}
        </Text>
      </Pressable>
    ),
    [handleLongPressProject, handleOpenProject],
  );

  if (isLoading && projects.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="返回首页"
        >
          <Text style={styles.backButtonText}>返回</Text>
        </Pressable>
        <Text style={styles.title}>我的作品</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={projects}
        keyExtractor={item => item.id}
        renderItem={renderProject}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Pressable
            style={({ pressed }) => [
              styles.card,
              styles.newCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() => {
              void handleCreateProject();
            }}
            disabled={isCreating}
            accessibilityRole="button"
            accessibilityLabel="新建作品"
          >
            {isCreating ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.cardTitle}>+ 新建作品</Text>
                <Text style={styles.cardMeta}>创建空白积木工作区</Text>
              </>
            )}
          </Pressable>
        }
        ListEmptyComponent={
          <Text style={styles.emptyHint}>还没有作品，点击上方卡片开始创作</Text>
        }
      />

      <Modal
        visible={renameTarget != null}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameTarget(null)}
      >
        <Pressable
          style={styles.renameBackdrop}
          onPress={() => setRenameTarget(null)}
        >
          <Pressable
            style={styles.renameSheet}
            onPress={event => event.stopPropagation()}
          >
            <Text style={styles.cardTitle}>重命名作品</Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="作品名称"
              autoFocus
              style={styles.renameInput}
            />
            <View style={styles.renameActions}>
              <Pressable onPress={() => setRenameTarget(null)}>
                <Text style={styles.cardMeta}>取消</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const trimmed = renameValue.trim();
                  if (renameTarget && trimmed) {
                    rename(renameTarget.id, trimmed).catch(() => undefined);
                  }
                  setRenameTarget(null);
                }}
              >
                <Text style={[styles.cardTitle, styles.renameSaveText]}>
                  保存
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
