import type { BuildGuidePliItemViewModel } from '../data/buildPliViewModels';
import { measurePliItem } from './measurePliItem';

export type BuildGuidePliLayoutItem = BuildGuidePliItemViewModel & {
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  column: number;
};

export type BuildGuidePliLayout = {
  items: BuildGuidePliLayoutItem[];
  columns: number;
  contentWidth: number;
  contentHeight: number;
  gap: number;
};

type PackPliItemsOptions = {
  containerWidth: number;
  minItemWidth?: number;
  gap?: number;
};

function resolveColumns(
  containerWidth: number,
  minItemWidth: number,
  gap: number,
): number {
  if (containerWidth <= minItemWidth) {
    return 1;
  }

  return Math.max(1, Math.floor((containerWidth + gap) / (minItemWidth + gap)));
}

export function packPliItems(
  items: ReadonlyArray<BuildGuidePliItemViewModel>,
  {
    containerWidth,
    minItemWidth = 136,
    gap = 10,
  }: PackPliItemsOptions,
): BuildGuidePliLayout {
  if (items.length === 0) {
    return {
      items: [],
      columns: 0,
      contentWidth: Math.max(containerWidth, 0),
      contentHeight: 0,
      gap,
    };
  }

  const safeContainerWidth = Math.max(containerWidth, minItemWidth);
  const columns = resolveColumns(safeContainerWidth, minItemWidth, gap);
  const itemWidth = Math.floor(
    (safeContainerWidth - gap * Math.max(columns - 1, 0)) / columns,
  );
  const measured = items.map(item => ({
    item,
    measurement: measurePliItem(item, itemWidth),
  }));
  const rowHeights: number[] = [];

  measured.forEach(({ measurement }, index) => {
    const row = Math.floor(index / columns);
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, measurement.height);
  });

  const rowY: number[] = [];
  const contentHeight = rowHeights.reduce((offset, height, row) => {
    rowY[row] = offset;
    return offset + height + (row === rowHeights.length - 1 ? 0 : gap);
  }, 0);

  return {
    items: measured.map(({ item, measurement }, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      return {
        ...item,
        x: column * (itemWidth + gap),
        y: rowY[row] ?? 0,
        width: itemWidth,
        height: rowHeights[row] ?? measurement.height,
        row,
        column,
      };
    }),
    columns,
    contentWidth: safeContainerWidth,
    contentHeight,
    gap,
  };
}