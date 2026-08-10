import { useCallback, useEffect, useRef } from 'react';
import type { NavigationAction } from '@react-navigation/native';

type Flush = () => Promise<void>;

/** react-navigation 事件类型太严苛（EventMap/State 泛型差异），只声明 hook 用到的最小形状。 */
type BeforeRemoveEventArg = {
  preventDefault?: () => void;
  data: { action: unknown };
};

type FlushNavigation = {
  goBack: () => void;
  dispatch: (action: NavigationAction) => void;
  addListener: (
    event: 'beforeRemove',
    listener: (event: BeforeRemoveEventArg) => void,
  ) => () => void;
};

/**
 * 编辑器离开保护：拦截 beforeRemove，先 flush 持久化再放行导航。
 * 手动返回（header back 按钮）直接 await flush 后 goBack，避免与拦截互锁。
 */
export function useEditorLeaveFlush(
  navigation: FlushNavigation,
  flush: Flush,
) {
  const allowNavigationAfterFlushRef = useRef(false);
  const isFlushingBeforeRemoveRef = useRef(false);

  const handleNavigateBack = useCallback(async () => {
    await flush();
    allowNavigationAfterFlushRef.current = true;
    navigation.goBack();
    setTimeout(() => {
      allowNavigationAfterFlushRef.current = false;
    }, 0);
  }, [flush, navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (allowNavigationAfterFlushRef.current) {
        return;
      }

      event.preventDefault?.();

      if (isFlushingBeforeRemoveRef.current) {
        return;
      }

      isFlushingBeforeRemoveRef.current = true;
      void (async () => {
        try {
          await flush();
          allowNavigationAfterFlushRef.current = true;
          navigation.dispatch(event.data.action as NavigationAction);
          setTimeout(() => {
            allowNavigationAfterFlushRef.current = false;
          }, 0);
        } finally {
          isFlushingBeforeRemoveRef.current = false;
        }
      })();
    });

    return unsubscribe;
  }, [flush, navigation]);

  return { handleNavigateBack };
}