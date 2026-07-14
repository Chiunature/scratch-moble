# 编辑器 bundle（本地生成）

编辑器 HTML 由构建脚本同步到：

`apps/mobile/assets/editor/editorBundle.html`

（该文件 gitignored；由 Metro 作为静态资源打包，进入编辑器页面后再读取。）

此 `generated/` 目录保留仅为兼容说明，不再生成巨大的 TypeScript 字符串。

克隆仓库或修改 `packages/scratch-editor-web` 后请执行：

```sh
yarn editor:web
```

`yarn android` / `yarn ios` 也会在启动前自动 sync。
