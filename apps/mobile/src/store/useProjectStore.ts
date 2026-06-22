import { create } from 'zustand';

import type { ScratchProjectSummary } from '@scratch-mobile/shared';

import {
  createProject as createProjectOnDisk,
  deleteProject as deleteProjectOnDisk,
  listProjects,
  renameProject as renameProjectOnDisk,
} from '../services/projects';

type ProjectStore = {
  projects: ScratchProjectSummary[];
  isLoading: boolean;
  loadProjects: () => Promise<void>;
  createAndTrack: (name?: string) => Promise<ScratchProjectSummary>;
  rename: (projectId: string, name: string) => Promise<void>;
  remove: (projectId: string) => Promise<void>;
  upsertSummary: (summary: ScratchProjectSummary) => void;
};

export const useProjectStore = create<ProjectStore>(set => ({
  projects: [],
  isLoading: false,

  loadProjects: async () => {
    set({ isLoading: true });
    try {
      const projects = await listProjects();
      set({ projects, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
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
