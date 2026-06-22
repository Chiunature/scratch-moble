import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ScratchProjectSummary } from '@scratch-mobile/shared';

const STORAGE_KEY = '@scratch-mobile/projects-index';

function sortByUpdatedAtDesc(
  projects: ScratchProjectSummary[],
): ScratchProjectSummary[] {
  return [...projects].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export async function loadProjectIndex(): Promise<ScratchProjectSummary[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ScratchProjectSummary[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortByUpdatedAtDesc(
      parsed
        .filter(item => typeof item?.id === 'string' && item.id.length > 0)
        .map(item => ({
          ...item,
          createdAt: item.createdAt ?? item.updatedAt,
        })),
    );
  } catch {
    return [];
  }
}

export async function saveProjectIndex(
  projects: ScratchProjectSummary[],
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(sortByUpdatedAtDesc(projects)),
  );
}

export function upsertProjectSummary(
  projects: ScratchProjectSummary[],
  summary: ScratchProjectSummary,
): ScratchProjectSummary[] {
  const next = projects.filter(project => project.id !== summary.id);
  next.unshift(summary);
  return sortByUpdatedAtDesc(next);
}

export function removeProjectSummary(
  projects: ScratchProjectSummary[],
  projectId: string,
): ScratchProjectSummary[] {
  return projects.filter(project => project.id !== projectId);
}
