import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_BUILD_GUIDE_SETTINGS,
  type BuildGuideSettings,
  type LineContrastMode,
  type ShowOldColorsMode,
  type StepAnimationMode,
  type StudHighContrastMode,
  type StudLogoMode,
} from './types';

const STORAGE_KEY = '@scratch-mobile/buildGuide/settings/v1';

function asMode<T extends number>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'number' && (allowed as readonly number[]).includes(value)
    ? (value as T)
    : fallback;
}

export function normalizeBuildGuideSettings(
  raw: Partial<BuildGuideSettings> | null | undefined,
): BuildGuideSettings {
  const base = DEFAULT_BUILD_GUIDE_SETTINGS;
  if (!raw) {
    return { ...base };
  }

  return {
    lineContrast: asMode<LineContrastMode>(raw.lineContrast, [0, 1], base.lineContrast),
    studHighContrast: asMode<StudHighContrastMode>(
      raw.studHighContrast,
      [0, 1],
      base.studHighContrast,
    ),
    studLogo: asMode<StudLogoMode>(raw.studLogo, [0, 1], base.studLogo),
    showOldColors: asMode<ShowOldColorsMode>(
      raw.showOldColors,
      [0, 1, 2, 3],
      base.showOldColors,
    ),
    showStepRotationAnimations: asMode<StepAnimationMode>(
      raw.showStepRotationAnimations,
      [0, 1, 2],
      base.showStepRotationAnimations,
    ),
  };
}

export async function loadBuildGuideSettings(): Promise<BuildGuideSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_BUILD_GUIDE_SETTINGS };
    }
    return normalizeBuildGuideSettings(
      JSON.parse(raw) as Partial<BuildGuideSettings>,
    );
  } catch {
    return { ...DEFAULT_BUILD_GUIDE_SETTINGS };
  }
}

export async function saveBuildGuideSettings(
  settings: BuildGuideSettings,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
