import type { ScratchProjectDocument } from '@scratch-mobile/shared';

/** Reserved for future schema migrations. v1 passes through unchanged. */
export function migrateProjectDocument(
  document: ScratchProjectDocument,
): ScratchProjectDocument {
  return document;
}
