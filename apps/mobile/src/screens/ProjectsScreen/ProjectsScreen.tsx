import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Pressable,
  Text,
  useWindowDimensions,
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
import { colors, spacing } from '../../theme';
import { useProjectStore } from '../../store/useProjectStore';
import {
  ProjectActionModal,
  type ProjectDeletePayload,
  type ProjectRenamePayload,
} from './ProjectActionModal';
import { notify } from '../../services/notifications';
import { styles } from './ProjectsScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Projects'>;

type ProjectListItem =
  | { kind: 'create' }
  | { kind: 'project'; project: ScratchProjectSummary };

const DELETE_ANIMATION_MS = 400;
const GRID_COLUMN_COUNT = 4;
const CREATE_PROJECT_KEY = 'create-project';

/** 模块级稳定引用，避免 FlatList 因 keyExtractor 每次新建而重渲染 */
const projectKeyExtractor = (item: ProjectListItem): string =>
  item.kind === 'create'
    ? CREATE_PROJECT_KEY
    : `project-${item.project.id}`;

function resolveLocalImageUri(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) {
    return path;
  }
  return `file://${path}`;
}

const ProjectCardContent = memo(function ProjectCardContent({
  item,
}: {
  item: ScratchProjectSummary;
}) {
  const { t } = useTranslation('projects');
  const displayName = resolveProjectDisplayName(item.name);
  const thumbnailUri = item.thumbnailPath
    ? resolveLocalImageUri(item.thumbnailPath)
    : null;

  return (
    <>
      {thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri }}
          style={styles.cardThumbnail}
          resizeMode="contain"
        />
      ) : null}
      <View style={styles.cardTextWrap}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {displayName}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {t('blockCount')} {item.blockCount ?? 0}
        </Text>
      </View>
    </>
  );
});

const NewProjectCard = memo(function NewProjectCard({
  cardSize,
  isCreating,
  onPress,
}: {
  cardSize: number;
  isCreating: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation('projects');
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        styles.cardShadow,
        styles.newCard,
        { width: cardSize },
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      disabled={isCreating}
      accessibilityRole="button"
      accessibilityLabel={t('newProject')}
    >
      {isCreating ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <Text style={styles.newCardIcon}>+</Text>
          <Text
            style={[styles.cardTitle, { textAlign: 'center' }]}
            numberOfLines={2}
          >
            {t('newProject')}
          </Text>
        </>
      )}
    </Pressable>
  );
});

type ProjectCardProps = {
  project: ScratchProjectSummary;
  cardSize: number;
  isDeleting: boolean;
  deleteAnim: Animated.Value;
  onOpen: (projectId: string) => void;
  onMore: (project: ScratchProjectSummary) => void;
};

const ProjectCard = memo(function ProjectCard({
  project,
  cardSize,
  isDeleting,
  deleteAnim,
  onOpen,
  onMore,
}: ProjectCardProps) {
  const { t } = useTranslation('projects');
  const displayName = resolveProjectDisplayName(project.name);

  if (!isDeleting) {
    return (
      <View style={[styles.card, styles.cardShadow, { width: cardSize }]}>
        <Pressable
          style={({ pressed }) => [
            styles.cardContent,
            pressed && styles.cardPressed,
          ]}
          onPress={() => onOpen(project.id)}
          accessibilityRole="button"
          accessibilityLabel={t('openProjectAccessibility', {
            name: displayName,
          })}
        >
          <ProjectCardContent item={project} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.moreButton,
            pressed && styles.moreButtonPressed,
          ]}
          onPress={() => onMore(project)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={t('modal.manageTitle', { name: displayName })}
        >
          <View style={styles.moreDots}>
            <View style={styles.moreDot} />
            <View style={styles.moreDot} />
            <View style={styles.moreDot} />
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        styles.cardShadow,
        {
          width: cardSize,
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
      <View style={styles.cardContent}>
        <ProjectCardContent item={project} />
      </View>
    </Animated.View>
  );
});

export function ProjectsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { t } = useTranslation('projects');
  const { t: tCommon } = useTranslation('common');
  const projects = useProjectStore(state => state.projects);
  const loadStatus = useProjectStore(state => state.status);
  const loadProjects = useProjectStore(state => state.loadProjects);
  const createAndTrack = useProjectStore(state => state.createAndTrack);
  const rename = useProjectStore(state => state.rename);
  const remove = useProjectStore(state => state.remove);
  const listItems = useMemo<ProjectListItem[]>(
    () => [
      { kind: 'create' },
      ...projects.map(project => ({ kind: 'project' as const, project })),
    ],
    [projects],
  );
  const cardSize = Math.floor(
    (windowWidth -
      spacing.md * 2 -
      spacing.sm * (GRID_COLUMN_COUNT - 1)) /
      GRID_COLUMN_COUNT,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [actionTarget, setActionTarget] =
    useState<ScratchProjectSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const handleOpenProjectActions = useCallback(
    (project: ScratchProjectSummary) => {
      setActionTarget(project);
    },
    [],
  );

  const handleRenameProject = useCallback(
    async ({ projectId, oldName, newName }: ProjectRenamePayload) => {
      try {
        await rename(projectId, newName);
        notify.success(
          t('renameSuccessTitle'),
          t('renameSuccessMessage', {
            oldName: resolveProjectDisplayName(oldName),
            newName: resolveProjectDisplayName(newName),
          }),
        );
      } catch {
        notify.error(
          t('renameFailedTitle'),
          t('renameFailedMessage', {
            oldName: resolveProjectDisplayName(oldName),
          }),
        );
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
        notify.deleted(
          t('deleteSuccessTitle'),
          t('deleteSuccessMessage', {
            projectName: resolveProjectDisplayName(projectName),
          }),
        );
      } catch {
        deleteAnim.setValue(1);
        notify.error(
          t('deleteFailedTitle'),
          t('deleteFailedMessage', {
            projectName: resolveProjectDisplayName(projectName),
          }),
        );
      } finally {
        setDeletingId(null);
      }
    },
    [deleteAnim, remove, t],
  );

  const renderListItem = useCallback(
    ({ item }: { item: ProjectListItem }) => {
      if (item.kind === 'create') {
        return (
          <NewProjectCard
            cardSize={cardSize}
            isCreating={isCreating}
            onPress={handleCreateProject}
          />
        );
      }

      const project = item.project;
      return (
        <ProjectCard
          project={project}
          cardSize={cardSize}
          isDeleting={project.id === deletingId}
          deleteAnim={deleteAnim}
          onOpen={handleOpenProject}
          onMore={handleOpenProjectActions}
        />
      );
    },
    [
      cardSize,
      deleteAnim,
      deletingId,
      handleCreateProject,
      handleOpenProject,
      handleOpenProjectActions,
      isCreating,
    ],
  );

  const listContentContainerStyle = useMemo(
    () => [
      styles.listContent,
      { paddingBottom: insets.bottom + spacing['3xl'] },
    ],
    [insets.bottom],
  );

  if (loadStatus === 'loading' && projects.length === 0) {
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

      <FlatList<ProjectListItem>
        data={listItems}
        keyExtractor={projectKeyExtractor}
        renderItem={renderListItem}
        numColumns={GRID_COLUMN_COUNT}
        columnWrapperStyle={styles.listRow}
        contentContainerStyle={listContentContainerStyle}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          projects.length === 0 ? (
            <Text style={styles.emptyHint}>{t('noProjects')}</Text>
          ) : null
        }
      />

      <ProjectActionModal
        visible={actionTarget != null}
        project={actionTarget}
        onClose={() => setActionTarget(null)}
        onRename={handleRenameProject}
        onDelete={handleDeleteProject}
      />
    </View>
  );
}
