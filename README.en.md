# Daynote (随记)

> Plan · Execute · Review · Reflect — manage every day in one place.

[简体中文](./README.md) · English

A **local-first** desktop app for notes and todos: schedule on the calendar, jot notes as you go, and review your progress by week or month. Your data stays on your own machine — nothing is uploaded to a server.

## ✨ Features

- **Plan** — Pick any date on the month calendar, add tasks with tags, and reschedule to tomorrow / this weekend / next week at any time. Move overdue tasks to today in one click, or bulk-postpone everything still unfinished.
- **Notes** — Live Markdown rendering (headings, lists, todos, quotes, code blocks, bold, inline code); save explicitly with the button or ⌘S, and edits are also saved when you leave the note; tag filtering and in-body find (⌘F).
- **Review** — Completion count, rate, overdue, productive days and tag distribution for today / yesterday / this week / last week / this month / last month, with bar and line chart modes.
- **Search** — ⌘K global search across note titles, note bodies and tasks, with highlighted matches and click-to-jump.
- **Appearance & data** — Light / dark / follow-system themes; a default tag; export / import JSON backups; clear all data.
- **Local-first** — Tasks and notes live only on your machine; writes are atomic and keep the latest 20 automatic backups; an in-app confirmation dialog replaces flaky native prompts.

## 🛠 Tech Stack

| Layer | Choice |
| --- | --- |
| Desktop framework | Tauri 2 |
| Frontend | React 18 + TypeScript 5.7 |
| Build | Vite 6 |
| State | Zustand 5 |
| Backend | Rust (serde / serde_json) |
| Testing | Vitest (frontend) + cargo test (Rust) |

## 📋 Requirements

- Node.js 18+ and npm
- Rust (`rust-version = 1.90`) and Cargo
- macOS / Windows / Linux (platforms supported by Tauri)

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Desktop development mode (recommended)
npm run tauri dev

# Frontend only (runs in the browser, falls back to localStorage)
npm run dev
```

Build a release:

```bash
npm run tauri build
```

## 📜 Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite frontend dev server (port 1420) |
| `npm run tauri dev` | Start the Tauri desktop app (dev mode) |
| `npm run build` | Type-check and build the frontend into `dist/` |
| `npm run tauri build` | Package a release installer |
| `npm run typecheck` | Run `tsc --noEmit` only |
| `npm run test` | Run frontend unit tests (Vitest) |
| `npm run test:watch` | Run frontend tests in watch mode |

## 💾 Data & Storage

Data is stored locally as JSON files:

- **Development (`npm run tauri dev`)**: `src-tauri/data/`
- **Release**: `~/.daynote/`
- **Override**: set the `DAYNOTE_DATA_DIR` environment variable to any directory (portable / testing)

Directory layout:

```
<data-dir>/
├── state.json    Settings (theme, default tag, …)
├── tasks.json    Tasks
├── notes.json    Notes
└── backups/      Latest 20 automatic backups (created on change)
```

Writes use "write temp file + atomic rename", and unchanged content is neither rewritten nor backed up. The actual storage location is shown on the Settings page under "About"; you can also export a JSON backup at any time.

## 📁 Project Structure

```
.
├── src/                     Frontend
│   ├── components/          Shared components (Sidebar, DatePop, ConfirmHost…)
│   ├── views/               Pages
│   │   ├── plan/            Plan page
│   │   ├── notes/           Notes page
│   │   ├── review/          Review page
│   │   ├── search/          Search page
│   │   ├── settings/        Settings page
│   │   └── help/            Help page
│   ├── store/               Zustand state (data / ui / persist slices + autosave)
│   ├── lib/                 Pure functions and utilities (selectors, stats, markdown, date…)
│   └── styles/              Styles
├── src-tauri/               Tauri (Rust) backend
│   └── src/
│       ├── models.rs        Data models
│       ├── paths.rs         Storage path resolution
│       ├── storage.rs       Read / write and backups
│       ├── commands.rs      IPC commands
│       └── lib.rs           App entry
└── docs/                    Requirements and design drafts
```

## ⌨️ Keyboard Shortcuts

| Group | Shortcut | Action |
| --- | --- | --- |
| Global | `⌘ K` | Open global search |
| Global | `⌘ N` | New note |
| Global | `⌘ I` | New todo |
| Plan | `Enter` | Submit and create task |
| Plan | `Shift Enter` | Newline within the task |
| Plan | `Esc` | Collapse the quick-add input |
| Notes | `⌘ E` | Enter edit mode |
| Notes | `Esc` | Cancel edit (revert unsaved changes) / cancel new note |
| Notes | `⌘ F` | Find in body |
| Notes | `⌘ B` | Bold the selection |
| Notes | `` ⌘ ` `` | Inline code |
| Notes | `⌘ /` | Insert / remove code block |
| Notes | `Tab` / `Shift Tab` | Increase / decrease indent |
| Search | `Esc` | Close search |

## 🧪 Development & Testing

```bash
npm run typecheck                                                 # Frontend type-check
npm run test                                                      # Frontend unit tests
cargo test  --manifest-path src-tauri/Cargo.toml                  # Rust unit tests
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets   # Rust lint
```

## ❓ FAQ

- **Is my data uploaded to a server?** No. Tasks and notes stay on your machine — see "Data & Storage" above.
- **How do I move to a new computer?** Export a JSON file from the old device's Settings page, then import it on the new device.
- **Why does a task show "overdue"?** Its scheduled date has passed but it is not checked off. Use the "Overdue" card on the left to move it to today.

See the in-app "Help" page for more.

## 📄 License

Not specified yet.
