const mockMetadata = new Map<string, string>();

jest.mock('../src/services/storage/kvStore', () => ({
  kvStore: {
    getItem: async (key: string) => mockMetadata.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mockMetadata.set(key, value);
    },
    removeItem: async (key: string) => {
      mockMetadata.delete(key);
    },
  },
}));

import { createAssistantCredentialStore } from '../src/services/assistant/credentials';

const profile = {
  id: 'developer',
  baseUrl: 'https://api.example.com/v1/',
  model: 'test-model',
  supportsJsonSchema: false,
};

describe('assistant credentials', () => {
  beforeEach(() => mockMetadata.clear());

  it('normalizes the profile and keeps the API key out of metadata', async () => {
    const secure = new Map<string, string>();
    const store = createAssistantCredentialStore({
      getItemAsync: async key => secure.get(key) ?? null,
      setItemAsync: async (key, value) => {
        secure.set(key, value);
      },
      deleteItemAsync: async key => {
        secure.delete(key);
      },
    });

    await store.save(profile, 'secret-key');
    const raw = mockMetadata.get('assistant.connection.profile');
    expect(raw).toBeDefined();
    expect(raw).not.toContain('secret-key');
    expect(JSON.parse(raw as string).baseUrl).toBe(
      'https://api.example.com/v1',
    );
    await expect(store.load()).resolves.toEqual({
      profile: { ...profile, baseUrl: 'https://api.example.com/v1' },
      apiKey: 'secret-key',
    });
  });

  it('rejects malformed metadata without throwing or returning a key', async () => {
    mockMetadata.set('assistant.connection.profile', '{bad');
    const store = createAssistantCredentialStore({
      getItemAsync: async () => 'secret-key',
      setItemAsync: async () => undefined,
      deleteItemAsync: async () => undefined,
    });

    await expect(store.load()).resolves.toBeNull();
    expect(mockMetadata.has('assistant.connection.profile')).toBe(false);
  });

  it('propagates secure deletion failures and keeps metadata for retry', async () => {
    const secure = new Map<string, string>();
    const store = createAssistantCredentialStore({
      getItemAsync: async key => secure.get(key) ?? null,
      setItemAsync: async (key, value) => {
        secure.set(key, value);
      },
      deleteItemAsync: async () => {
        throw new Error('secure store unavailable');
      },
    });
    await store.save(profile, 'secret-key');

    await expect(store.clear()).rejects.toThrow('secure store unavailable');
    expect(mockMetadata.has('assistant.connection.profile')).toBe(true);
  });
});
