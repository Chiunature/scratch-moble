const mockMetadata = new Map<string, string>();
const mockSecure = new Map<string, string>();
let mockNative: object | null = null;

jest.mock('expo', () => ({ requireOptionalNativeModule: () => mockNative }));
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
import {
  activateAssistantConnection,
  clearAssistantConnection,
  deleteAssistantConnection,
  getAssistantConnection,
  isAssistantSecureStorageAvailable,
  saveAssistantConnection,
} from '../src/services/assistant/nativeConnection';
const profile = {
  id: 'test',
  baseUrl: 'https://example.com/v1',
  model: 'model',
};
const native = {
  getValueWithKeyAsync: async (key: string) => mockSecure.get(key) ?? null,
  setValueWithKeyAsync: async (value: string, key: string) => {
    mockSecure.set(key, value);
  },
  deleteValueWithKeyAsync: async (key: string) => {
    mockSecure.delete(key);
  },
};
beforeEach(async () => {
  mockMetadata.clear();
  mockSecure.clear();
  mockNative = null;
  await clearAssistantConnection();
});
it('supports session credentials without SecureStore and never persists plaintext', async () => {
  expect(isAssistantSecureStorageAvailable()).toBe(false);
  await saveAssistantConnection(profile, 'session-secret', false);
  expect(await getAssistantConnection()).toEqual({
    profile,
    apiKey: 'session-secret',
  });
  expect(mockMetadata.size).toBe(0);
  await expect(
    saveAssistantConnection(profile, 'secret', true),
  ).rejects.toThrow('系统安全存储不可用');
  await clearAssistantConnection();
  expect(await getAssistantConnection()).toBeNull();
});
it('replaces address-bound keys and deletes all owned credentials', async () => {
  mockNative = native;
  await saveAssistantConnection(profile, 'first-key', true);
  const firstKeys = [...mockSecure.keys()];
  await saveAssistantConnection(
    { ...profile, baseUrl: 'https://new.example.com/v1' },
    'second-key',
    true,
  );
  expect(mockSecure.size).toBe(1);
  expect(mockSecure.has(firstKeys[0])).toBe(false);
  expect([...mockMetadata.values()].join()).not.toMatch(/first-key|second-key/);
  await clearAssistantConnection();
  expect(mockSecure.size).toBe(0);
  expect(mockMetadata.size).toBe(0);
});
it('cannot claim deletion or session-only mode when previous secure credentials are inaccessible', async () => {
  mockNative = native;
  await saveAssistantConnection(profile, 'persisted', true);
  mockNative = null;
  await expect(clearAssistantConnection()).rejects.toThrow('无法删除');
  await expect(
    saveAssistantConnection(profile, 'session', false),
  ).rejects.toThrow('无法删除');
  expect(mockSecure.size).toBe(1);
});
it('does not follow tampered endpoint metadata to retrieve a key', async () => {
  mockNative = native;
  await saveAssistantConnection(profile, 'secret', true);
  const key = 'assistant.connection.profile';
  const metadata = JSON.parse(mockMetadata.get(key)!);
  metadata.profiles[0] = {
    ...metadata.profiles[0],
    baseUrl: 'https://attacker.example/v1',
  };
  mockMetadata.set(key, JSON.stringify(metadata));
  expect(await getAssistantConnection()).toBeNull();
});
it('keeps the other profile when saving, and start chooses the active one', async () => {
  mockNative = native;
  await saveAssistantConnection(profile, 'first-key', true);
  await saveAssistantConnection(
    { id: 'other', baseUrl: 'https://other.example/v1', model: 'other-model' },
    'second-key',
    true,
  );
  expect(mockSecure.size).toBe(2);
  expect((await getAssistantConnection())?.profile.id).toBe('test');
  await activateAssistantConnection('other');
  expect((await getAssistantConnection())?.profile.id).toBe('other');
  await deleteAssistantConnection('other');
  expect(await getAssistantConnection()).toBeNull();
  expect(mockSecure.size).toBe(1);
});
it('sanitizes native storage errors instead of exposing credentials', async () => {
  mockNative = {
    ...native,
    setValueWithKeyAsync: async () => {
      throw new Error('native secret-key');
    },
  };
  await expect(
    saveAssistantConnection(profile, 'secret-key', true),
  ).rejects.toThrow('安全凭据保存失败');
  expect(mockMetadata.size).toBe(0);
});
