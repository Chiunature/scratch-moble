declare module 'pinyin-pro' {
  export type PinyinOptions = {
    toneType?: 'symbol' | 'num' | 'none';
    type?: 'string' | 'array';
    separator?: string;
  };

  export function pinyin(text: string, options?: PinyinOptions): string;
}
