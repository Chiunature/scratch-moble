import { useCallback, useEffect, useRef, useState } from 'react';

import { loadBuildGuideSettings, saveBuildGuideSettings } from './storage';
import { syncLdrOptions } from './syncLdrOptions';
import {
  DEFAULT_BUILD_GUIDE_SETTINGS,
  isAppearanceOption,
  isGeometryOption,
  type BuildGuideSettings,
} from './types';

type UseBuildGuideSettingsResult = {
  settings: BuildGuideSettings;
  /** AsyncStorage 读回并已 sync 到 LDR.Options */
  ready: boolean;
  updateSetting: <K extends keyof BuildGuideSettings>(
    key: K,
    value: BuildGuideSettings[K],
  ) => void;
  /** 边线/高亮变更 → 刷新外观 */
  appearanceRevision: number;
  /** stud 几何变更 → 重载模型 */
  geometryRevision: number;
};

export function useBuildGuideSettings(): UseBuildGuideSettingsResult {
  const [settings, setSettings] = useState<BuildGuideSettings>(
    DEFAULT_BUILD_GUIDE_SETTINGS,
  );
  const [ready, setReady] = useState(false);
  const [appearanceRevision, setAppearanceRevision] = useState(0);
  const [geometryRevision, setGeometryRevision] = useState(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    let cancelled = false;
    void loadBuildGuideSettings().then(loaded => {
      if (cancelled) {
        return;
      }
      syncLdrOptions(loaded);
      settingsRef.current = loaded;
      setSettings(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSetting = useCallback(
    <K extends keyof BuildGuideSettings>(
      key: K,
      value: BuildGuideSettings[K],
    ) => {
      const prev = settingsRef.current;
      if (prev[key] === value) {
        return;
      }
      const next = { ...prev, [key]: value };
      settingsRef.current = next;
      setSettings(next);
      syncLdrOptions(next);
      void saveBuildGuideSettings(next);
      if (isAppearanceOption(key)) {
        setAppearanceRevision(token => token + 1);
      }
      if (isGeometryOption(key)) {
        setGeometryRevision(token => token + 1);
      }
    },
    [],
  );

  return {
    settings,
    ready,
    updateSetting,
    appearanceRevision,
    geometryRevision,
  };
}
