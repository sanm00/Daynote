# Daynote 图标 — 留白的 D

正式图标使用「留白的 D」设计，以 SVG 为源文件。

- 一个竖向笔画与饱满弧线构成 D，在右上方留出开口，表达记录仍可继续。
- 笔画宽度为 10 个单位，端点圆润；开口端点的净间距约为 12.2 个单位，在 24px 下约为 2.9px。
- 沿用界面主色陶土色 `#b96545`，桌面符号用米白色 `#fffdf8`。
- 侧栏使用透明底独立符号 `src/assets/daynote-mark.svg`。
- 桌面图标使用纯色圆角底板，源文件为 `src/assets/daynote-icon.svg`，通用 PNG 为 `src/assets/daynote-icon.png`。
- 无渐变、投影、纹理或附加装饰。

桌面 PNG、ICO、ICNS 位于 `src-tauri/icons/`，使用 Tauri CLI 从同一 SVG 导出，文件名遵循 Tauri 平台约定。[预览页](preview.html)可查看大小尺寸与浅深背景。

重新生成桌面资源：

```bash
npm run tauri -- icon src/assets/daynote-icon.svg
```
