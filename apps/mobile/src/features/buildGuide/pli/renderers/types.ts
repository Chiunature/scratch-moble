export type PliThumbnailViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PliThumbnailRequest = {
  key: string;
  partID: string;
  colorID: number;
  viewport: PliThumbnailViewport;
};