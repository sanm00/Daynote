# Contributing to Daynote

感谢你对随记 Daynote 的关注！Issues 和 Pull Request 都欢迎。

## 开始之前

- 提 Bug 或建议前，先搜索一下已有的 Issues，避免重复。
- 计划做较大的改动（新模块、架构调整）时，建议先开一个 Issue 讨论，以免方向不一致。
- 交流请使用中文或英文均可。

## 开发环境

- Node.js 18+ 与 npm
- Rust 1.90+（`edition = 2024`）与 Cargo
- macOS / Windows / Linux（Tauri 2 支持的桌面平台）

```bash
npm install          # 安装依赖
npm run tauri dev    # 桌面开发模式（推荐）
npm run dev          # 仅前端（浏览器内运行，数据回退 localStorage）
```

开发数据保存在 `src-tauri/data/`（已 gitignore），可直接编辑其中的 JSON 造测试数据。

## 代码风格

- TypeScript / React：遵循现有文件组织（`src/components`、`src/views/<page>`、`src/lib` 纯函数、`src/store` Zustand 切片）。
- Rust：`src-tauri/src` 按 `models / paths / storage / commands` 分层，勿将业务逻辑塞入 `lib.rs`。
- 不引入新的重型依赖前请先在 Issue 中说明理由。
- **不要添加注释**，除非解释「为什么」而非「做了什么」；命名优先自解释。

## 提交规范

使用 Conventional Commits 前缀，描述可用中文：

```
feat: 新增 xxx
fix: 修复 xxx
docs: 文档调整
refactor: 不带行为变化的重构
chore: 杂项 / 工程化
```

一次 PR 聚焦一件事，避免顺手夹带无关改动。

## 测试与自检

提交前请确保本地全部通过：

```bash
npm run typecheck
npm run test
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test  --manifest-path src-tauri/Cargo.toml
```

CI 会在 push 与 PR 时跑同样的检查。涉及 UI 的改动请在描述中附截图或录屏。

## Pull Request

- 基于 `main` 创建分支，PR 也合并到 `main`。
- 标题沿用提交规范（如 `feat: 支持标签拖拽排序`）。
- 描述写清动机、做法与影响面；关联对应的 Issue（如 `Closes #12`）。
- 若改动数据结构（JSON schema），请在 PR 中说明兼容/迁移策略。

## 行为准则

参与本项目即表示你同意遵守 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。

## 许可证

提交即表示你的贡献以 [Apache License 2.0](./LICENSE) 授权，与项目本身一致。
