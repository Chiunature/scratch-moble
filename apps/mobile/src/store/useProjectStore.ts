import { create } from 'zustand';

import type { ScratchProjectSummary } from '@scratch-mobile/shared';

import {
  createProject as createProjectOnDisk,
  deleteProject as deleteProjectOnDisk,
  listProjects,
  reconcileProjects,
  renameProject as renameProjectOnDisk,
} from '../services/projects';

type ProjectStore = {
  projects: ScratchProjectSummary[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  loadProjects: () => Promise<void>;
  reconcileAndTrack: () => Promise<void>;
  createAndTrack: (name?: string) => Promise<ScratchProjectSummary>;
  rename: (projectId: string, name: string) => Promise<void>;
  remove: (projectId: string) => Promise<void>;
  upsertSummary: (summary: ScratchProjectSummary) => void;
};

export const useProjectStore = create<ProjectStore>(set => ({
  projects: [],
  status: 'idle',

  loadProjects: async () => {
    set({ status: 'loading', error: undefined });
    try {
      const projects = await listProjects();
      set({ projects, status: 'ready' });
      // Background reconcile keeps the index honest without blocking first paint.
      void reconcileProjects()
        .then(reconciled => {
          set({ projects: reconciled });
        })
        .catch(() => undefined);
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  reconcileAndTrack: async () => {
    const projects = await reconcileProjects();
    set({ projects });
  },

  createAndTrack: async name => {
    const summary = await createProjectOnDisk(name);
    set(state => ({
      projects: [summary, ...state.projects.filter(item => item.id !== summary.id)],
    }));
    return summary;
  },

  rename: async (projectId, name) => {
    const summary = await renameProjectOnDisk(projectId, name);
    set(state => ({
      projects: state.projects.map(project =>
        project.id === projectId ? summary : project,
      ),
    }));
  },

  remove: async projectId => {
    await deleteProjectOnDisk(projectId);
    set(state => ({
      projects: state.projects.filter(project => project.id !== projectId),
    }));
  },

  upsertSummary: summary => {
    set(state => ({
      projects: [
        summary,
        ...state.projects.filter(project => project.id !== summary.id),
      ],
    }));
  },
}));
