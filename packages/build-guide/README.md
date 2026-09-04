# 搭建指南

移动端搭建指南由运行时的 **MPD** 清单驱动。

```
apps/mobile/assets/buildGuide/
  catalog.json                 # 模型选择列表（id、nameKey、可选封面）
  models/
    <model-id>/
      manifest.json            # MpdManifest（MPD URI、主模型 ID、摄像机等）
      build/export.mpd
      cover.png                # 可选的模型封面（任意本地图片名称；需在 bundles.ts 中注册）
      starter-workspace.json   # 可选：点击模型后打开的「入门程序」scratch-blocks 工作区快照
```

## 使用流程

1. 从首页进入 **搭建指南**，打开模型选择页面（`catalog.json`）。
2. 选择模型后，播放器会加载该模型的 `manifest.json` 和 MPD 文件。

## 添加模型

1. 添加 `assets/buildGuide/models/<id>/manifest.json` 和 `build/export.mpd`。
2. 在 `apps/mobile/src/features/buildGuide/data/bundles.ts` 中注册静态 `require`。
3. 在 `catalog.json` 中追加模型条目。
4. 在 `packages/i18n/.../buildGuide.json` 中添加对应的国际化 `nameKey` 文本。
5. 在 `apps/mobile/scripts/generate-ldraw-subset.mjs` 中注册 MPD，然后重新执行以下命令：

```bash
yarn workspace @scratch-mobile/mobile ldraw:subset
yarn workspace @scratch-mobile/mobile ldraw:sync
```

`ldraw:subset` 只保留内置 `build/export.mpd` 模型所引用的零件。
应用中不要打包完整的 LDraw 零件目录。

## 引擎

LDraw 解析、步骤处理和零件计数功能位于 `@scratch-mobile/ldr-engine` 中，
底层使用 `buildinginstructions.js` 算法和 Three.js `BufferGeometry` 路径。
