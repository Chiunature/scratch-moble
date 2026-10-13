import type {
  AssistantProposal,
  AssistantWorkspaceContext,
} from '@scratch-mobile/assistant-contracts';

export type AssistantConnectionProfile = {
  id: string;
  baseUrl: string;
  model: string;
  /** OpenAI-compatible services may differ in support for strict JSON Schema. */
  supportsJsonSchema?: boolean;
};

export type AssistantConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type GenerateAssistantProposalInput = {
  profile: AssistantConnectionProfile;
  apiKey: string;
  prompt: string;
  context: AssistantWorkspaceContext;
  conversation?: readonly AssistantConversationMessage[];
  signal?: AbortSignal;
};

export type AssistantUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type GenerateAssistantProposalResult = {
  proposal: AssistantProposal;
  assistantMessage: string;
  usage?: AssistantUsage;
};

export type AssistantResponse = Pick<
  Response,
  'ok' | 'status' | 'redirected' | 'text' | 'json'
> & {
  body?: {
    getReader: () => {
      read: () => Promise<{ done: boolean; value?: Uint8Array }>;
      cancel: () => Promise<void>;
      releaseLock?: () => void;
    };
  } | null;
};

// React Native's global RequestInit omits redirect; Expo fetch implements it.
export type AssistantFetch = (
  input: string,
  init?: RequestInit & { redirect?: 'error'; credentials?: 'omit' },
) => Promise<AssistantResponse>;
