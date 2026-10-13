import {
  AssistantRequestError,
  generateAssistantProposal,
  normalizeAssistantBaseUrl,
} from '../src/services/assistant/openAiCompatible';
import type { AssistantFetch } from '../src/services/assistant/types';

describe('assistant model client', () => {
  it('normalizes only safe HTTPS model endpoints', () => {
    expect(normalizeAssistantBaseUrl('https://api.example.com/')).toBe(
      'https://api.example.com',
    );
    expect(() => normalizeAssistantBaseUrl('http://api.example.com')).toThrow(
      AssistantRequestError,
    );
    expect(() =>
      normalizeAssistantBaseUrl('https://api.example.com?key=secret'),
    ).toThrow(AssistantRequestError);
    expect(normalizeAssistantBaseUrl('http://localhost:3000/')).toBe(
      'http://localhost:3000',
    );
  });

  it('sends structured output and validates the returned proposal', async () => {
    let requestUrl = '';
    let requestInit: RequestInit | undefined;
    const result = await generateAssistantProposal(
      {
        profile: {
          id: 'developer',
          baseUrl: 'https://api.example.com/v1/',
          model: 'test-model',
          supportsJsonSchema: true,
        },
        apiKey: 'developer-key',
        prompt: '让 E 口电机以 50% 功率运行。',
        context: {
          projectId: 'project-1',
          workspaceHash: 'hash-1',
          generatedCode: '',
          blocks: [],
        },
      },
      {
        fetch: async (url, init) => {
          requestUrl = url;
          requestInit = init;
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      schemaVersion: 1,
                      intent: 'create',
                      summary: '运行 E 口电机',
                      operations: [
                        {
                          kind: 'replaceMainScript',
                          statements: [
                            { kind: 'motor.runPower', port: 4, power: 50 },
                          ],
                        },
                      ],
                    }),
                  },
                },
              ],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        },
      },
    );

    expect(requestUrl).toBe('https://api.example.com/v1/chat/completions');
    expect(requestInit?.headers).toMatchObject({
      Authorization: 'Bearer developer-key',
    });
    expect(requestInit).toMatchObject({
      redirect: 'error',
      credentials: 'omit',
    });
    expect(String(requestInit?.body)).not.toContain('developer-key');
    expect(result.proposal.operations).toHaveLength(1);
    expect(result.usage?.totalTokens).toBe(30);
  });

  it('maps authentication and invalid JSON failures without exposing the key', async () => {
    await expect(
      generateAssistantProposal(
        {
          profile: {
            id: 'developer',
            baseUrl: 'https://api.example.com',
            model: 'test-model',
          },
          apiKey: 'secret-key',
          prompt: '生成程序',
          context: {
            projectId: 'p',
            workspaceHash: 'h',
            generatedCode: '',
            blocks: [],
          },
        },
        {
          fetch: async () => new Response('unauthorized', { status: 401 }),
        },
      ),
    ).rejects.toMatchObject({
      code: 'http',
      message: '模型 API Key 无效或没有权限。',
    });

    await expect(
      generateAssistantProposal(
        {
          profile: {
            id: 'developer',
            baseUrl: 'https://api.example.com',
            model: 'test-model',
          },
          apiKey: 'secret-key',
          prompt: '生成程序',
          context: {
            projectId: 'p',
            workspaceHash: 'h',
            generatedCode: '',
            blocks: [],
          },
        },
        {
          fetch: async () =>
            new Response(
              JSON.stringify({
                choices: [{ message: { content: '{bad-json' } }],
              }),
              { status: 200 },
            ),
        },
      ),
    ).rejects.toMatchObject({
      code: 'response',
    });
  });

  it('does not start a request when already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = jest.fn() as jest.MockedFunction<AssistantFetch>;

    await expect(
      generateAssistantProposal(
        {
          profile: {
            id: 'developer',
            baseUrl: 'https://api.example.com',
            model: 'test-model',
          },
          apiKey: 'secret-key',
          prompt: '生成程序',
          context: {
            projectId: 'p',
            workspaceHash: 'h',
            generatedCode: '',
            blocks: [],
          },
          signal: controller.signal,
        },
        { fetch: fetchMock },
      ),
    ).rejects.toMatchObject({ code: 'network' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aborts while reading a response body after the timeout', async () => {
    let requestSignal: AbortSignal | undefined;
    const response = {
      ok: true,
      redirected: false,
      status: 200,
      text: () => new Promise<string>(() => undefined),
    } as Response;
    const fetchMock: AssistantFetch = async (_url, init) => {
      requestSignal = init?.signal ?? undefined;
      return response;
    };

    await expect(
      generateAssistantProposal(
        {
          profile: {
            id: 'developer',
            baseUrl: 'https://api.example.com',
            model: 'test-model',
          },
          apiKey: 'secret-key',
          prompt: '生成程序',
          context: {
            projectId: 'p',
            workspaceHash: 'h',
            generatedCode: '',
            blocks: [],
          },
        },
        { fetch: fetchMock, timeoutMs: 5 },
      ),
    ).rejects.toMatchObject({
      code: 'network',
      message: '模型请求已取消或超时。',
    });
    expect(requestSignal?.aborted).toBe(true);
  });

  it('rejects redirected responses and hides upstream error text and keys', async () => {
    const redirected = {
      ok: true,
      redirected: true,
      status: 200,
      text: async () => '',
    } as Response;
    await expect(
      generateAssistantProposal(
        {
          profile: {
            id: 'developer',
            baseUrl: 'https://api.example.com',
            model: 'test-model',
          },
          apiKey: 'secret-key',
          prompt: '生成程序',
          context: {
            projectId: 'p',
            workspaceHash: 'h',
            generatedCode: '',
            blocks: [],
          },
        },
        { fetch: async () => redirected },
      ),
    ).rejects.toMatchObject({ code: 'network' });

    await expect(
      generateAssistantProposal(
        {
          profile: {
            id: 'developer',
            baseUrl: 'https://api.example.com',
            model: 'test-model',
          },
          apiKey: 'secret-key',
          prompt: '生成程序',
          context: {
            projectId: 'p',
            workspaceHash: 'h',
            generatedCode: '',
            blocks: [],
          },
        },
        {
          fetch: async () => {
            throw new Error('provider secret-key leaked response');
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'network',
      message: '无法连接模型服务，请检查网络和接口地址。',
    });
  });

  it('keeps conversation history before the new prompt and bounds generation', async () => {
    let body:
      | { messages: Array<{ content: string }>; max_tokens: number }
      | undefined;
    const result = await generateAssistantProposal(
      {
        profile: {
          id: 'developer',
          baseUrl: 'https://api.example.com/custom',
          model: 'test-model',
        },
        apiKey: 'developer-key',
        prompt: 'new request',
        conversation: [{ role: 'user', content: 'old request' }],
        context: {
          projectId: 'p',
          workspaceHash: 'h',
          generatedCode: '',
          blocks: [],
        },
      },
      {
        fetch: async (_url, init) => {
          body = JSON.parse(String(init?.body)) as typeof body;
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      schemaVersion: 1,
                      intent: 'explain',
                      summary: 'ok',
                      operations: [],
                    }),
                  },
                },
              ],
            }),
            { status: 200 },
          );
        },
      },
    );

    expect(result.proposal.summary).toBe('ok');
    expect(body?.max_tokens).toBe(1024);
    expect(body?.messages[1]?.content).toBe('old request');
    expect(body?.messages[2]?.content).toContain('new request');
  });
});
