/**
 * Web 端会话 registry：统一 RN 浮层会话的存取（open/get/delete/clearAll）。
 * 硬约束：
 * - createSessionId 规则由各模块注入（field 模块必须保持同 field 同 sessionId，RN 端去重依赖此稳定性）。
 * - 打开已存在会话时的重发策略由各模块决定（matrix/note/handleShank 重发 open，slider 静默 return）。
 */

export type FieldSessionRegistry<T extends { field?: unknown }> = {
  /** 按 field 查找已存在会话（模块据此决定重发 open 或防重开） */
  findByField: (field: unknown) => { sessionId: string; session: T } | null;
  /** 建立新会话并返回 sessionId（id 由 opts.createSessionId 生成） */
  create: (session: T) => string;
  get: (sessionId: string) => T | undefined;
  /** 删除会话并返回原会话（不存在返回 undefined） */
  delete: (sessionId: string) => T | undefined;
  /** 清空全部会话（页面销毁 / WebView 重载时调用） */
  clearAll: () => void;
};

export function createFieldSessionRegistry<
  T extends { field?: unknown },
>(opts: {
  createSessionId: (field: T['field']) => string;
}): FieldSessionRegistry<T> {
  const sessions = new Map<string, T>();

  const findByField = (
    field: unknown,
  ): { sessionId: string; session: T } | null => {
    for (const [sessionId, session] of sessions) {
      if (session.field === field) {
        return { sessionId, session };
      }
    }
    return null;
  };

  const create = (session: T): string => {
    const sessionId = opts.createSessionId(session.field);
    sessions.set(sessionId, session);
    return sessionId;
  };

  const get = (sessionId: string): T | undefined => sessions.get(sessionId);

  const deleteSession = (sessionId: string): T | undefined => {
    const session = sessions.get(sessionId);
    if (session) {
      sessions.delete(sessionId);
    }
    return session;
  };

  const clearAll = (): void => {
    sessions.clear();
  };

  return { findByField, create, get, delete: deleteSession, clearAll };
}

/**
 * RN open 防抖：400ms 内同一 field 只放行一次 open。
 * （pointerdown / showEditor_ / reopen 会对同一 field 重复触发。）
 */
export function createRnOpenSuppressor<T extends object>(): (
  field: T,
) => boolean {
  const lastOpenAt = new WeakMap<T, number>();
  const SUPPRESS_MS = 400;

  return (field: T): boolean => {
    const now = performance.now();
    const last = lastOpenAt.get(field) ?? 0;
    if (now - last < SUPPRESS_MS) {
      return true;
    }
    lastOpenAt.set(field, now);
    return false;
  };
}