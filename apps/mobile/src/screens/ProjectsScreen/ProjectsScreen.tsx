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
import {
  getDefaultProjectName,
  resolveProjectDisplayName,
  useTranslation,
} from '@scratch-mobile/i18n';

import type { ScratchProjectSummary } from '@scratch-mobile/shared';
import { type RootStackParamList } from '../../app/navigation';
import { colors } from '../../theme';
import { useProjectStore } from '../../store/useProjectStore';
import {
  ProjectActionModal,
  type ProjectDeletePayload,
  type ProjectRenamePayload,
} from './ProjectActionModal';
import { Toast, type ToastState } from '../../components/Toast';
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
  const { t } = useTranslation('projects');
  const displayName = resolveProjectDisplayName(item.name);

  return (
    <>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {displayName}
      </Text>
      <Text style={styles.cardMeta}>
        {t('updatedOn')} {formatUpdatedAt(item.updatedAt)}
      </Text>
      <Text style={styles.cardMeta}>
        {t('blockCount')} {item.blockCount ?? 0}
      </Text>
    </>
  );
}

export function ProjectsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('projects');
  const { t: tCommon } = useTranslation('common');
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
  const [toast, setToast] = useState<ToastState>(null);
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
      const summary = await createAndTrack(getDefaultProjectName());
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
      setActionTarget(project);
    },
    [],
  );

  const handleRenameProject = useCallback(
    async ({ projectId, oldName, newName }: ProjectRenamePayload) => {
      try {
        await rename(projectId, newName);
        setToast({
          kind: 'success',
          title: t('renameSuccessTitle'),
          message: t('renameSuccessMessage', {
            oldName: resolveProjectDisplayName(oldName),
            newName: resolveProjectDisplayName(newName),
          }),
        });
      } catch {
        setToast({
          kind: 'error',
          title: t('renameFailedTitle'),
          message: t('renameFailedMessage', {
            oldName: resolveProjectDisplayName(oldName),
          }),
        });
        throw new Error('rename failed');
      }
    },
    [rename, t],
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
          title: t('deleteSuccessTitle'),
          message: t('deleteSuccessMessage', {
            projectName: resolveProjectDisplayName(projectName),
          }),
        });
      } catch {
        deleteAnim.setValue(1);
        setToast({
          kind: 'error',
          title: t('deleteFailedTitle'),
          message: t('deleteFailedMessage', {
            projectName: resolveProjectDisplayName(projectName),
          }),
        });
      } finally {
        setDeletingId(null);
      }
    },
    [deleteAnim, remove, t],
  );

  const renderProject = useCallback(
    ({ item }: { item: ScratchProjectSummary }) => {
      const isDeleting = item.id === deletingId;
      const displayName = resolveProjectDisplayName(item.name);

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
            accessibilityLabel={t('openProjectAccessibility', {
              name: displayName,
            })}
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
    [deleteAnim, deletingId, handleLongPressProject, handleOpenProject, t],
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
          accessibilityLabel={t('backToHome')}
        >
          <Text style={styles.backButtonText}>{tCommon('back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('title')}</Text>
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
            accessibilityLabel={t('newProject')}
          >
            {isCreating ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.cardTitle}>+ {t('newProject')}</Text>
                <Text style={styles.cardMeta}>{t('blankWorkspace')}</Text>
              </>
            )}
          </Pressable>
        }
        ListEmptyComponent={
          <Text style={styles.emptyHint}>{t('noProjects')}</Text>
        }
      />

      <ProjectActionModal
        visible={actionTarget != null}
        project={actionTarget}
        onClose={() => setActionTarget(null)}
        onRename={handleRenameProject}
        onDelete={handleDeleteProject}
      />

      <Toast
        toast={toast}
        topInset={insets.top}
        onHidden={() => setToast(null)}
      />
    </View>
  );
}
