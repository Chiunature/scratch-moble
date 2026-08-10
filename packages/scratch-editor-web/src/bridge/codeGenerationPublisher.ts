import { postToReactNative } from './index';
import { renderPythonCode } from '../codegen/generators';
import type { Workspace } from '../codegen/types';

/** 工作区变更后合并 codegen + postMessage，降低桥频率 */
const DEFAULT_DEBOUNCE_MS = 200;

type PublisherOptions = {
  debounceMs?: number;
};

/**
 * 创建「代码已生成」桥的调度器：
 * - schedule：防抖（默认 200ms），适合拖拽/连续编辑
 * - flush：立即发送；若 code/blockCount 与上次相同则跳过
 */
export function createCodeGenerationPublisher(
  workspace: Workspace,
  options?: PublisherOptions,
): {
  schedule: () => void;
  flush: () => void;
  dispose: () => void;
} {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSentCode = '';
  let lastSentBlockCount = -1;

  const flush = (): void => {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    const code = renderPythonCode(workspace);
    const blockCount = workspace.getAllBlocks(false).length;

    if (code === lastSentCode && blockCount === lastSentBlockCount) {
      return;
    }

    lastSentCode = code;
    lastSentBlockCount = blockCount;

    postToReactNative({
      type: 'editor.code.generated',
      code,
      blockCount,
    });
  };

  const schedule = (): void => {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(flush, debounceMs);
  };

  const dispose = (): void => {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  return { schedule, flush, dispose };
}
