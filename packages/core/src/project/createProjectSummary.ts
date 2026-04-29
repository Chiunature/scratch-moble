import {
  DEFAULT_PROJECT_NAME,
  type ScratchProjectSummary,
} from '@scratch-mobile/shared';

export function createProjectSummary(
  name = DEFAULT_PROJECT_NAME,
): ScratchProjectSummary {
  return {
    id: `project-${Date.now()}`,
    name,
    updatedAt: new Date().toISOString(),
  };
}
