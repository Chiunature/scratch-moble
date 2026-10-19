import {
  ASSISTANT_CAPABILITIES,
  ASSISTANT_CAPABILITY_CATALOG_VERSION,
  ASSISTANT_CODE_RESPONSE_JSON_SCHEMA,
  ASSISTANT_PROPOSAL_JSON_SCHEMA,
  ASSISTANT_PYTHON_RULES,
  parseAssistantCodeResponse,
  parseAssistantProposal,
  type AssistantCodeResponse,
  type AssistantProposal,
  type AssistantWorkspaceContext,
} from '@scratch-mobile/assistant-contracts';

import type {
  AssistantFetch,
  AssistantResponse,
  AssistantUsage,
  GenerateAssistantCodeInput,
  GenerateAssistantCodeResult,
  GenerateAssistantProposalInput,
  GenerateAssistantProposalResult,
} from './types';

const DEFAULT_REQUEST_TIMEOUT_MS = 45_000;
const MAX_PROMPT_LENGTH = 4_000;
const MAX_CONTEXT_CODE_LENGTH = 16_000;
const MAX_CONVERSATION_MESSAGES = 12;
const MAX_CONVERSATION_MESSAGE_LENGTH = 2_000;
const MAX_RESPONSE_LENGTH = 256_000;
const MAX_TOKENS = 1_024;
const CODE_MAX_TOKENS = 4_096;

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export class AssistantRequestError extends Error {
  readonly status?: number;
  readonly code: 'configuration' | 'network' | 'http' | 'response' | 'contract';

  constructor(
    message: string,
    code: AssistantRequestError['code'],
    status?: number,
  ) {
    super(message);
    this.name = 'AssistantRequestError';
    this.code = code;
    this.status = status;
  }
}

export function normalizeAssistantBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new AssistantRequestError('模型接口地址不能为空。', 'configuration');
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new AssistantRequestError(
      '模型接口地址不是有效的 URL。',
      'configuration',
    );
  }

  const isLocalHttp =
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '[::1]');
  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new AssistantRequestError(
      '模型接口必须使用 HTTPS；开发时仅允许本机使用 HTTP。',
      'configuration',
    );
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new AssistantRequestError(
      '接口地址不能包含用户名、密码、查询参数或片段。',
      'configuration',
    );
  }

  const path = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${path}`;
}

function chatCompletionsUrl(baseUrl: string): string {
  const normalized = normalizeAssistantBaseUrl(baseUrl);
  const url = new URL(normalized);
  const path = url.pathname.replace(/\/+$/, '');
  if (path.endsWith('/chat/completions')) return normalized;
  return `${url.origin}${path || '/v1'}/chat/completions`;
}

function createSystemPrompt(): string {
  const capabilities = ASSISTANT_CAPABILITIES.map(
    capability =>
      `- ${capability.kind}: ${capability.description}；参数限制：${
        Object.entries(capability.valueConstraints)
          .map(([key, value]) => `${key}=${value}`)
          .join('，') || '无'
      }`,
  ).join('\n');

  return [
    '你是 Scratch Mobile 的积木助手。',
    '只返回符合给定 JSON Schema 的对象，不要返回 Markdown、Python、JavaScript 或 Blockly 原始 JSON。',
    '你只能使用能力目录中的 kind；不能编造硬件端口、积木或固件 API。',
    'create 适用于创建主程序，modify 只能通过受限操作修改现有主程序，explain 不得包含修改操作。',
    `能力目录版本：${ASSISTANT_CAPABILITY_CATALOG_VERSION}`,
    '能力目录：',
    capabilities,
    '若需求超出能力目录（如循环、变量、传感器），返回澄清或解释，不得以不完整的动作替代用户需求。',
    '首版只能修改主程序的直接指令链；保留不支持的积木，不要整体替换已有程序。',
    '如果需求缺少端口、功率、时间等必要信息，把问题写入 clarificationQuestion，并将 operations 设为空数组。',
    JSON.stringify(ASSISTANT_PROPOSAL_JSON_SCHEMA),
  ].join('\n');
}

function assertInput(input: GenerateAssistantProposalInput): void {
  if (!input.apiKey.trim()) {
    throw new AssistantRequestError('请先配置模型 API Key。', 'configuration');
  }
  if (!input.profile.model.trim()) {
    throw new AssistantRequestError('请先配置模型名称。', 'configuration');
  }
  if (
    input.prompt.trim().length === 0 ||
    input.prompt.length > MAX_PROMPT_LENGTH
  ) {
    throw new AssistantRequestError(
      `需求不能为空且不能超过 ${MAX_PROMPT_LENGTH} 个字符。`,
      'configuration',
    );
  }
  if (input.context.generatedCode.length > MAX_CONTEXT_CODE_LENGTH) {
    throw new AssistantRequestError(
      '当前程序代码过长，请先缩小程序后再请求助手。',
      'configuration',
    );
  }
  if (
    input.context.blocks.length > 500 ||
    contextMessage(input.context).length > 128_000
  ) {
    throw new AssistantRequestError(
      '当前作品上下文过大，请缩小程序后再请求助手。',
      'configuration',
    );
  }
  if (
    input.conversation &&
    input.conversation.length > MAX_CONVERSATION_MESSAGES
  ) {
    throw new AssistantRequestError(
      '对话消息过多，请新建一次助手会话。',
      'configuration',
    );
  }
}

function contextMessage(context: AssistantWorkspaceContext): string {
  return JSON.stringify({
    projectId: context.projectId,
    workspaceHash: context.workspaceHash,
    generatedCode: context.generatedCode,
  });
}

function buildMessages(input: GenerateAssistantProposalInput): ChatMessage[] {
  const conversation = (input.conversation ?? []).map(message => ({
    role: message.role,
    content: message.content.slice(0, MAX_CONVERSATION_MESSAGE_LENGTH),
  }));

  return [
    { role: 'system', content: createSystemPrompt() },
    ...conversation,
    {
      role: 'user',
      content: [
        '当前编辑器上下文如下：',
        contextMessage(input.context),
        '',
        '请处理以下用户需求：',
        input.prompt,
      ].join('\n'),
    },
  ];
}

function parseJsonContent(content: unknown): unknown {
  if (typeof content !== 'string') {
    throw new AssistantRequestError(
      '模型响应缺少可解析的 content。',
      'response',
    );
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new AssistantRequestError(
      '模型没有返回有效 JSON，不能应用到积木。',
      'response',
    );
  }
}

function normalizeUsage(value: unknown): AssistantUsage | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const usage = value as Record<string, unknown>;
  const promptTokens =
    typeof usage.promptTokens === 'number'
      ? usage.promptTokens
      : typeof usage.prompt_tokens === 'number'
      ? usage.prompt_tokens
      : undefined;
  const completionTokens =
    typeof usage.completionTokens === 'number'
      ? usage.completionTokens
      : typeof usage.completion_tokens === 'number'
      ? usage.completion_tokens
      : undefined;
  const totalTokens =
    typeof usage.totalTokens === 'number'
      ? usage.totalTokens
      : typeof usage.total_tokens === 'number'
      ? usage.total_tokens
      : undefined;
  if (
    promptTokens === undefined &&
    completionTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }
  return { promptTokens, completionTokens, totalTokens };
}

function readAssistantResponse(payload: unknown): {
  content: unknown;
  usage?: AssistantUsage;
} {
  if (typeof payload !== 'object' || payload === null) {
    throw new AssistantRequestError('模型响应不是对象。', 'response');
  }
  const record = payload as {
    choices?: Array<{ message?: { content?: unknown } }>;
    usage?: AssistantUsage;
  };
  const content = record.choices?.[0]?.message?.content;
  if (content === undefined) {
    throw new AssistantRequestError(
      '模型响应缺少 choices[0].message.content。',
      'response',
    );
  }
  return { content, usage: normalizeUsage(record.usage) };
}

function errorMessage(status: number): string {
  if (status === 401 || status === 403) return '模型 API Key 无效或没有权限。';
  if (status === 429) return '模型服务额度不足或请求过于频繁。';
  if (status >= 500) return '模型服务暂时不可用，请稍后重试。';
  return `模型服务请求失败（HTTP ${status}）。`;
}

function isAbortError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const value = error as { name?: unknown; message?: unknown };
  return (
    value.name === 'AbortError' ||
    (typeof value.message === 'string' &&
      /\babort(?:ed|ing)?\b/i.test(value.message))
  );
}

function defaultFetch(): AssistantFetch {
  // Loading Expo fetch lazily keeps injected unit tests independent of native modules.
  const moduleValue = require('expo/fetch') as { fetch: AssistantFetch };
  return moduleValue.fetch;
}

async function readResponseText(
  response: AssistantResponse,
  signal: AbortSignal,
): Promise<string> {
  const readBody = async (): Promise<string> => {
    const reader = response.body?.getReader?.();
    if (!reader) {
      const text =
        typeof response.text === 'function'
          ? await response.text()
          : JSON.stringify(await response.json());
      if (text.length > MAX_RESPONSE_LENGTH) {
        throw new AssistantRequestError(
          '模型响应过大，已拒绝处理。',
          'response',
        );
      }
      return text;
    }

    // Expo installs TextDecoder, but RN's global type declarations omit it.
    const { TextDecoder } = globalThis as unknown as {
      TextDecoder: new () => {
        decode: (input?: Uint8Array, options?: { stream: boolean }) => string;
      };
    };
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) {
          chunks.push(decoder.decode());
          return chunks.join('');
        }
        if (!next.value) continue;
        totalBytes += next.value.byteLength;
        if (totalBytes > MAX_RESPONSE_LENGTH) {
          await reader.cancel();
          throw new AssistantRequestError(
            '模型响应过大，已拒绝处理。',
            'response',
          );
        }
        chunks.push(decoder.decode(next.value, { stream: true }));
      }
    } catch (error) {
      try {
        await reader.cancel();
      } catch {
        // The stream may already be closed.
      }
      throw error;
    } finally {
      reader.releaseLock?.();
    }
  };

  if (signal.aborted) {
    throw new Error('The operation was aborted.');
  }
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new Error('The operation was aborted.'));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([readBody(), aborted]);
  } finally {
    if (onAbort) signal.removeEventListener('abort', onAbort);
  }
}

export async function generateAssistantProposal(
  input: GenerateAssistantProposalInput,
  options: {
    fetch?: AssistantFetch;
    timeoutMs?: number;
  } = {},
): Promise<GenerateAssistantProposalResult> {
  assertInput(input);
  if (input.signal?.aborted) {
    throw new AssistantRequestError('模型请求已取消。', 'network');
  }

  const fetchImpl = options.fetch ?? defaultFetch();
  const timeoutController = new AbortController();
  const timeout = setTimeout(
    () => timeoutController.abort(),
    options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
  );
  const abortListener = () => timeoutController.abort();
  input.signal?.addEventListener('abort', abortListener, { once: true });

  try {
    const response = await fetchImpl(
      chatCompletionsUrl(input.profile.baseUrl),
      {
        method: 'POST',
        redirect: 'error',
        credentials: 'omit',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${input.apiKey}`,
        },
        body: JSON.stringify({
          model: input.profile.model,
          temperature: 0.1,
          max_tokens: MAX_TOKENS,
          messages: buildMessages(input),
          response_format:
            input.profile.supportsJsonSchema === false
              ? { type: 'json_object' }
              : {
                  type: 'json_schema',
                  json_schema: {
                    name: 'scratch_mobile_assistant_proposal',
                    strict: true,
                    schema: ASSISTANT_PROPOSAL_JSON_SCHEMA,
                  },
                },
        }),
        signal: timeoutController.signal,
      },
    );

    if (response.redirected) {
      throw new AssistantRequestError('模型服务重定向被拒绝。', 'network');
    }
    if (!response.ok) {
      throw new AssistantRequestError(
        errorMessage(response.status),
        'http',
        response.status,
      );
    }

    let body: string;
    try {
      body = await readResponseText(response, timeoutController.signal);
    } catch (error) {
      if (error instanceof AssistantRequestError) throw error;
      if (isAbortError(error)) {
        throw new AssistantRequestError('模型请求已取消或超时。', 'network');
      }
      throw new AssistantRequestError(
        '模型服务返回的数据不可读取。',
        'response',
      );
    }
    if (body.length > MAX_RESPONSE_LENGTH) {
      throw new AssistantRequestError('模型响应过大，已拒绝处理。', 'response');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new AssistantRequestError(
        '模型服务返回的数据不是有效 JSON。',
        'response',
      );
    }

    const parsed = readAssistantResponse(payload);
    let proposal: AssistantProposal;
    try {
      proposal = parseAssistantProposal(parseJsonContent(parsed.content));
    } catch (error) {
      if (error instanceof AssistantRequestError) throw error;
      throw new AssistantRequestError('模型提案未通过安全校验。', 'contract');
    }

    return {
      proposal,
      assistantMessage: proposal.explanation ?? proposal.summary,
      usage: parsed.usage,
    };
  } catch (error) {
    if (error instanceof AssistantRequestError) throw error;
    if (isAbortError(error)) {
      throw new AssistantRequestError('模型请求已取消或超时。', 'network');
    }
    throw new AssistantRequestError(
      '无法连接模型服务，请检查网络和接口地址。',
      'network',
    );
  } finally {
    clearTimeout(timeout);
    timeoutController.abort();
    input.signal?.removeEventListener('abort', abortListener);
  }
}

function createPythonSystemPrompt(): string {
  return [
    ASSISTANT_PYTHON_RULES,
    '若用户是在修改已有程序，请基于当前 Python 输出完整新程序，不要输出差异。',
    'JSON Schema：',
    JSON.stringify(ASSISTANT_CODE_RESPONSE_JSON_SCHEMA),
  ].join('\n');
}

function buildPythonMessages(input: GenerateAssistantCodeInput): ChatMessage[] {
  const conversation = (input.conversation ?? []).map(message => ({
    role: message.role,
    content: message.content.slice(0, MAX_CONVERSATION_MESSAGE_LENGTH),
  }));
  const repair = input.repair
    ? [
        '',
        '上一次 Python 没有通过本地反编译，请修正后重新输出完整 JSON。',
        `错误：${input.repair.error.slice(0, 2_000)}`,
        '失败的 Python：',
        input.repair.python.slice(0, MAX_CONTEXT_CODE_LENGTH),
      ].join('\n')
    : '';
  return [
    { role: 'system', content: createPythonSystemPrompt() },
    ...conversation,
    {
      role: 'user',
      content: [
        '当前编辑器上下文如下：',
        contextMessage(input.context),
        '',
        '请处理以下用户需求，并输出完整主程序：',
        input.prompt,
        repair,
      ].join('\n'),
    },
  ];
}

export async function generateAssistantCode(
  input: GenerateAssistantCodeInput,
  options: {
    fetch?: AssistantFetch;
    timeoutMs?: number;
  } = {},
): Promise<GenerateAssistantCodeResult> {
  assertInput(input);
  if (input.signal?.aborted) {
    throw new AssistantRequestError('模型请求已取消。', 'network');
  }
  const fetchImpl = options.fetch ?? defaultFetch();
  const timeoutController = new AbortController();
  const timeout = setTimeout(
    () => timeoutController.abort(),
    options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
  );
  const abortListener = () => timeoutController.abort();
  input.signal?.addEventListener('abort', abortListener, { once: true });
  try {
    const response = await fetchImpl(
      chatCompletionsUrl(input.profile.baseUrl),
      {
        method: 'POST',
        redirect: 'error',
        credentials: 'omit',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${input.apiKey}`,
        },
        body: JSON.stringify({
          model: input.profile.model,
          temperature: 0.1,
          max_tokens: CODE_MAX_TOKENS,
          messages: buildPythonMessages(input),
          response_format:
            input.profile.supportsJsonSchema === false
              ? { type: 'json_object' }
              : {
                  type: 'json_schema',
                  json_schema: {
                    name: 'scratch_mobile_assistant_python',
                    strict: true,
                    schema: ASSISTANT_CODE_RESPONSE_JSON_SCHEMA,
                  },
                },
        }),
        signal: timeoutController.signal,
      },
    );
    if (response.redirected) {
      throw new AssistantRequestError('模型服务重定向被拒绝。', 'network');
    }
    if (!response.ok) {
      throw new AssistantRequestError(
        errorMessage(response.status),
        'http',
        response.status,
      );
    }
    const body = await readResponseText(response, timeoutController.signal);
    if (body.length > MAX_RESPONSE_LENGTH) {
      throw new AssistantRequestError('模型响应过大，已拒绝处理。', 'response');
    }
    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new AssistantRequestError(
        '模型服务返回的数据不是有效 JSON。',
        'response',
      );
    }
    const parsed = readAssistantResponse(payload);
    let code: AssistantCodeResponse;
    try {
      code = parseAssistantCodeResponse(parseJsonContent(parsed.content));
    } catch (error) {
      if (error instanceof AssistantRequestError) throw error;
      throw new AssistantRequestError('模型代码未通过安全校验。', 'contract');
    }
    return {
      response: code,
      assistantMessage: code.message,
      usage: parsed.usage,
    };
  } catch (error) {
    if (error instanceof AssistantRequestError) throw error;
    if (isAbortError(error)) {
      throw new AssistantRequestError('模型请求已取消或超时。', 'network');
    }
    throw new AssistantRequestError(
      '无法连接模型服务，请检查网络和接口地址。',
      'network',
    );
  } finally {
    clearTimeout(timeout);
    timeoutController.abort();
    input.signal?.removeEventListener('abort', abortListener);
  }
}
