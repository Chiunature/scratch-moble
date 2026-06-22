import {
  createEmptyProjectDocument,
  parseProjectDocumentJson,
  ProjectDocumentParseError,
  serializeProjectDocument,
} from '../src/project';

describe('project document', () => {
  test('builds and serializes an empty project document', () => {
    const document = createEmptyProjectDocument('测试作品', {
      id: 'project-test-id',
      now: '2026-06-22T00:00:00.000Z',
    });

    expect(document).toMatchObject({
      schemaVersion: 1,
      id: 'project-test-id',
      name: '测试作品',
      createdAt: '2026-06-22T00:00:00.000Z',
      updatedAt: '2026-06-22T00:00:00.000Z',
      workspace: null,
      editor: { scratchBlocksVersion: '2.1.19' },
    });

    const roundTrip = parseProjectDocumentJson(
      serializeProjectDocument(document),
    );
    expect(roundTrip).toEqual(document);
  });

  test('rejects invalid JSON', () => {
    expect(() => parseProjectDocumentJson('{')).toThrow(
      ProjectDocumentParseError,
    );
  });

  test('rejects unsupported schema version', () => {
    expect(() =>
      parseProjectDocumentJson(
        JSON.stringify({
          schemaVersion: 99,
          id: 'x',
          name: 'x',
          createdAt: 't',
          updatedAt: 't',
          editor: { scratchBlocksVersion: '2.1.19' },
          workspace: null,
        }),
      ),
    ).toThrow(ProjectDocumentParseError);
  });
});
