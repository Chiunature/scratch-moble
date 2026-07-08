import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  loadMpdFromUrl,
  type LoadedLdrModel,
  type LdrLoadIssue,
  type LdrPartsBuilderFacade,
  type LdrStepHandlerFacade,
} from '@scratch-mobile/ldr-engine';

import { readLocalLdrawPart } from '../data/readLocalLdrawPart';
import { resolveMpdUri } from '../data/bundles';
import type { BuildGuideManifest } from '../types';

type UseLdrModelResult = {
  ready: boolean;
  model: LoadedLdrModel | null;
  stepHandler: LdrStepHandlerFacade | null;
  partsBuilder: LdrPartsBuilderFacade | null;
  progress: number;
  error: Error | null;
  reload: () => void;
};

function formatLoadError(manifest: BuildGuideManifest, cause: unknown): Error {
  const detail = cause instanceof Error ? cause.message : String(cause);
  return new Error(
    `Failed to load build guide "${manifest.id}" (mainModelId=${manifest.mainModelId}): ${detail}`,
  );
}

export function useLdrModel(manifest: BuildGuideManifest): UseLdrModelResult {
  const [model, setModel] = useState<LoadedLdrModel | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken(token => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setModel(null);
    setProgress(0);
    setError(null);

    let mpdUri: string;
    try {
      mpdUri = resolveMpdUri(manifest);
    } catch (cause) {
      setError(formatLoadError(manifest, cause));
      return () => {
        cancelled = true;
      };
    }

    let loadedFiles = 0;

    loadMpdFromUrl(mpdUri, manifest.mainModelId, {
      partsSource: manifest.partsSource ?? 'local',
      partsBaseUrl: manifest.partsBaseUrl,
      readLocalPart: readLocalLdrawPart,
      mainModelColor: manifest.mainModelColor,
      mode: manifest.mode,
      displayScale: manifest.displayScale,
      onProgress() {
        loadedFiles += 1;
        if (!cancelled) {
          setProgress(Math.min(loadedFiles / 40, 0.95));
        }
      },
      onError(issue: LdrLoadIssue) {
        console.warn(
          `[buildGuide:ldr:${manifest.id}]`,
          issue.message,
          issue.subModel ?? '',
        );
      },
    })
      .then((loaded: LoadedLdrModel) => {
        if (cancelled) {
          return;
        }
        setModel(loaded);
        setProgress(1);
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return;
        }
        setError(formatLoadError(manifest, cause));
      });

    return () => {
      cancelled = true;
    };
  }, [manifest, reloadToken]);

  return useMemo(
    () => ({
      ready: model != null && error == null,
      model,
      stepHandler: model?.stepHandler ?? null,
      partsBuilder: model?.partsBuilder ?? null,
      progress,
      error,
      reload,
    }),
    [error, model, progress, reload],
  );
}

export type { UseLdrModelResult };
