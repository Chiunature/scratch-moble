import type { LdrPliEntry } from '@scratch-mobile/ldr-engine';

export type BuildGuidePliItemViewModel = {
  key: string;
  partID: string;
  colorID: number;
  colorName: string;
  colorHex: string;
  quantity: number;
  quantityText: string;
  title: string;
  subtitle?: string;
  annotation?: string;
};

function cleanDescription(description: string | undefined): string | undefined {
  const trimmed = description?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function buildPliViewModel(entry: LdrPliEntry): BuildGuidePliItemViewModel {
  const description = cleanDescription(entry.description);
  const title = description ?? entry.partID;
  const subtitle =
    !description || description === entry.partID
      ? entry.colorName
      : `${entry.partID} · ${entry.colorName}`;

  return {
    key: entry.key,
    partID: entry.partID,
    colorID: entry.c,
    colorName: entry.colorName,
    colorHex: entry.colorHex,
    quantity: entry.amount,
    quantityText: `× ${entry.amount}`,
    title,
    subtitle,
    annotation: entry.annotation,
  };
}

export function buildPliViewModels(
  entries: ReadonlyArray<LdrPliEntry>,
): BuildGuidePliItemViewModel[] {
  return entries.map(buildPliViewModel);
}