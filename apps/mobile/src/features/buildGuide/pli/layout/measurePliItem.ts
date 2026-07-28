import type { BuildGuidePliItemViewModel } from '../data/buildPliViewModels';

export type PliItemMeasurement = {
  width: number;
  height: number;
  titleLines: number;
  subtitleLines: number;
  annotationLines: number;
};

export const PLI_CARD_VERTICAL_PADDING = 18;
export const PLI_THUMBNAIL_HEIGHT = 72;
export const PLI_TITLE_LINE_HEIGHT = 17;
export const PLI_SUBTITLE_LINE_HEIGHT = 15;
export const PLI_ANNOTATION_LINE_HEIGHT = 14;
export const PLI_SECTION_GAP = 8;

function estimateLineCount(text: string | undefined, charsPerLine: number): number {
  if (!text) {
    return 0;
  }

  return Math.max(1, Math.ceil(text.length / Math.max(charsPerLine, 1)));
}

export function measurePliItem(
  item: BuildGuidePliItemViewModel,
  width: number,
): PliItemMeasurement {
  const textWidth = Math.max(width - 32, 80);
  const charsPerLine = Math.max(10, Math.floor(textWidth / 7));
  const titleLines = Math.min(2, estimateLineCount(item.title, charsPerLine));
  const subtitleLines = Math.min(2, estimateLineCount(item.subtitle, charsPerLine));
  const annotationLines = Math.min(1, estimateLineCount(item.annotation, charsPerLine));

  return {
    width,
    height:
      PLI_CARD_VERTICAL_PADDING * 2 +
      PLI_THUMBNAIL_HEIGHT +
      PLI_SECTION_GAP +
      titleLines * PLI_TITLE_LINE_HEIGHT +
      subtitleLines * PLI_SUBTITLE_LINE_HEIGHT +
      annotationLines * PLI_ANNOTATION_LINE_HEIGHT,
    titleLines,
    subtitleLines,
    annotationLines,
  };
}