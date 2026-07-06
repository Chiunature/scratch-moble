import 'fast-text-encoding';

import { applyThreeTextureLoaderStub } from './applyThreeTextureLoaderStub';

applyThreeTextureLoaderStub();

type BrowserWindow = {
  parent: BrowserWindow;
};

const browserGlobal = globalThis as typeof globalThis & {
  window?: BrowserWindow;
};

if (browserGlobal.window === undefined) {
  browserGlobal.window = globalThis as unknown as BrowserWindow;
}

browserGlobal.window.parent = browserGlobal.window;
