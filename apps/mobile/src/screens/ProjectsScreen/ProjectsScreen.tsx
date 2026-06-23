import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ScratchProjectSummary } from '@scratch-mobile/shared';
import { type RootStackParamList } from '../../app/navigation';
import { colors } from '../../theme';
import { useProjectStore } from '../../store/useProjectStore';
import {
  ProjectActionModal,
  ProjectActionToast,
  type ProjectActionToastState,
  type ProjectDeletePayload,
  type ProjectRenamePayload,
} from './ProjectActionModal';
import { styles } from './ProjectsScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Projects'>;

const DELETE_ANIMATION_MS = 400;

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function ProjectCardContent({ item }: { item: ScratchProjectSummary }) {
  return (
    <>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.cardMeta}>
        更新于 {formatUpdatedAt(item.updatedAt)}
      </Text>
      <Text style={styles.cardMeta}>积木数量 {item.blockCount ?? 0}</Text>
    </>
  );
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
  const [actionTarget, setActionTarget] =
    useState<ScratchProjectSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ProjectActionToastState>(null);
  const deleteAnim = useRef(new Animated.Value(1)).current;
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!deletingId) {
      deleteAnim.setValue(1);
      return;
    }

    deleteAnim.setValue(1);
    Animated.timing(deleteAnim, {
      toValue: 0,
      duration: DELETE_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [deleteAnim, deletingId]);

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

  const handleLongPressProject = useCallback((project: ScratchProjectSummary) => {
    setActionTarget(project);
  }, []);

  const handleRenameProject = useCallback(
    async ({ projectId, oldName, newName }: ProjectRenamePayload) => {
      try {
        await rename(projectId, newName);
        setToast({
          kind: 'success',
          title: '重命名成功',
          message: `「${oldName}」已重命名为「${newName}」`,
        });
      } catch {
        setToast({
          kind: 'error',
          title: '重命名失败',
          message: `「${oldName}」未能重命名，请重试`,
        });
        throw new Error('rename failed');
      }
    },
    [rename],
  );

  const handleDeleteProject = useCallback(
    async ({ projectId, projectName }: ProjectDeletePayload) => {
      setDeletingId(projectId);

      await new Promise<void>(resolve => {
        if (deleteTimerRef.current) {
          clearTimeout(deleteTimerRef.current);
        }
        deleteTimerRef.current = setTimeout(() => {
          deleteTimerRef.current = null;
          resolve();
        }, DELETE_ANIMATION_MS);
      });

      try {
        await remove(projectId);
        setToast({
          kind: 'delete',
          title: '已删除',
          message: `「${projectName}」已被删除`,
        });
      } catch {
        deleteAnim.setValue(1);
        setToast({
          kind: 'error',
          title: '删除失败',
          message: `「${projectName}」未能删除，请重试`,
        });
      } finally {
        setDeletingId(null);
      }
    },
    [deleteAnim, remove],
  );

  const renderProject = useCallback(
    ({ item }: { item: ScratchProjectSummary }) => {
      const isDeleting = item.id === deletingId;

      if (!isDeleting) {
        return (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              styles.cardShadow,
              pressed && styles.cardPressed,
            ]}
            onPress={() => handleOpenProject(item.id)}
            onLongPress={() => handleLongPressProject(item)}
            accessibilityRole="button"
            accessibilityLabel={`打开作品 ${item.name}`}
          >
            <ProjectCardContent item={item} />
          </Pressable>
        );
      }

      return (
        <Animated.View
          style={[
            styles.card,
            {
              opacity: deleteAnim,
              transform: [
                {
                  scale: deleteAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.82, 1],
                  }),
                },
                {
                  translateY: deleteAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <ProjectCardContent item={item} />
        </Animated.View>
      );
    },
    [deleteAnim, deletingId, handleLongPressProject, handleOpenProject],
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
              styles.cardShadow,
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

      <ProjectActionModal
        visible={actionTarget != null}
        project={actionTarget}
        onClose={() => setActionTarget(null)}
        onRename={handleRenameProject}
        onDelete={handleDeleteProject}
      />

      <ProjectActionToast
        toast={toast}
        topInset={insets.top}
        onHidden={() => setToast(null)}
      />
    </View>
  );
}
