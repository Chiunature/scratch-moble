import { readFileSync, existsSync } from 'node:fs';

import { buildLocalPartCandidates } from './localPartPaths';

export function createFilesystemPartReader(rootDir: string) {
  return async (id: string): Promise<string | null> => {
    const candidates = buildLocalPartCandidates(id, [rootDir]);

    for (const candidate of candidates) {
      if (!existsSync(candidate)) {
        continue;
      }
      return readFileSync(candidate, 'utf8');
    }

    return null;
  };
}
