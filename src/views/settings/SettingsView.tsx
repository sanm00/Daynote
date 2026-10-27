import { useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { fmt } from '@/lib/date';
import { TagManager } from './TagManager';
import { SCHEMA_VERSION } from '@/lib/constants';
import { toast } from '@/lib/toast';
import { isTauriRuntime } from '@/lib/storage';
import { pickJsonFile, saveJsonFile } from '@/lib/fileio';
import { confirmDialog } from '@/lib/confirm';

export function SettingsView() {
  const settings = useAppStore((s) => s.settings);
  const setTheme = useAppStore((s) => s.setTheme);
  const tags = useAppStore(s => s.tags);
  const tasks = useAppStore((s) => s.tasks);
  const notes = useAppStore((s) => s.notes);
  const storagePath = useAppStore((s) => s.storagePath);
  const storageKind = useAppStore((s) => s.storageKind);
  const importData = useAppStore((s) => s.importData);
  const resetAll = useAppStore((s) => s.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (busy) return;
    const data = {
      app: '随记 Daynote',
      version: SCHEMA_VERSION,
      tags,
      exportedAt: new Date().toISOString(),
      settings: { ...settings },
      tasks,
      notes,
    };
    setBusy(true);
    try {
      const { path, cancelled } = await saveJsonFile(
        `daynote-${fmt(new Date())}.json`,
        JSON.stringify(data, null, 2),
      );
      if (cancelled) return;
      toast(path ? `已导出到 ${path.replace(/[\\/][^\\/]*$/, '')}` : '数据已导出');
    } catch (error) {
      toast(`导出失败：${String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const readFileText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.onload = (ev) => resolve(String(ev.target?.result ?? ''));
      reader.readAsText(file);
    });

  const applyImportedJson = (text: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      toast('文件格式错误，导入失败');
      return;
    }
    if (!parsed || typeof parsed !== 'object') {
      toast('文件格式错误，导入失败');
      return;
    }
    const d = parsed as Record<string, unknown>;
    if (!Array.isArray(d.tasks) && !Array.isArray(d.notes)) {
      toast('文件里没有可导入的任务或笔记');
      return;
    }
    importData({ tasks: d.tasks, notes: d.notes, settings: d.settings, tags: d.tags });
    toast('数据已导入');
  };

  const handleImport = async (file: File) => {
    setBusy(true);
    try {
      applyImportedJson(await readFileText(file));
    } catch (error) {
      toast(String(error instanceof Error ? error.message : error));
    } finally {
      setBusy(false);
    }
  };

  const onImportClick = async () => {
    if (busy) return;
    const file = await pickJsonFile();
    if (file) {
      void handleImport(file);
      return;
    }
    if (isTauriRuntime()) return;
    fileRef.current?.click();
  };

  const handleClear = async () => {
    if (busy) return;
    const ok = await confirmDialog({
      title: '清空所有数据',
      message: '确定要清空所有任务和笔记吗？此操作不可恢复。',
      confirmText: '清空',
      cancelText: '取消',
      danger: true,
    });
    if (!ok) return;
    resetAll();
    toast('已清空所有数据');
  };

  return (
    <section className="page active" id="page-settings">
      <div className="settings-scroll">
        <div className="card setting-card">
          <div className="setting-title">外观</div>
          <div className="setting-row">
            <div>
              <div className="setting-label">主题</div>
              <div className="setting-desc">选择界面配色方案，跟随系统会自动适配</div>
            </div>
            <div className="seg-group" id="themeSeg">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  className={`seg-btn${settings.theme === t ? ' active' : ''}`}
                  data-theme={t}
                  onClick={() => {
                    setTheme(t);
                    toast(`主题已切换为「${t === 'light' ? '浅色' : t === 'dark' ? '深色' : '跟随系统'}」`);
                  }}
                >
                  {t === 'light' ? '浅色' : t === 'dark' ? '深色' : '跟随系统'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <TagManager />

        <div className="card setting-card">
          <div className="setting-title">数据管理</div>
          <div className="setting-row">
            <div>
              <div className="setting-label">导出数据</div>
              <div className="setting-desc">把所有任务和笔记保存为 JSON 文件，便于备份</div>
            </div>
            <button className="btn ghost" disabled={busy} onClick={() => void handleExport()}>
              {busy ? '处理中…' : '导出'}
            </button>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-label">导入数据</div>
              <div className="setting-desc">从 JSON 文件恢复，只覆盖文件里包含的部分</div>
            </div>
            <button className="btn ghost" disabled={busy} onClick={() => void onImportClick()}>
              导入
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImport(file);
                e.target.value = '';
              }}
            />
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-label">清空所有数据</div>
              <div className="setting-desc">删除全部任务与笔记，操作不可恢复</div>
            </div>
            <button className="btn danger" disabled={busy} onClick={() => void handleClear()}>
              清空
            </button>
          </div>
        </div>

        <div className="card setting-card">
          <div className="setting-title">关于</div>
          <div className="about-row">
            <span>应用名称</span>
            <b>随记</b>
          </div>
          <div className="about-row">
            <span>English Name</span>
            <b>Daynote</b>
          </div>
          <div className="about-row">
            <span>版本</span>
            <b>v1.0.0</b>
          </div>
          <div className="about-row">
            <span>数据存储</span>
            <b>{storagePath ?? (storageKind === 'local' ? '浏览器本地' : '未知')}</b>
          </div>
          <div className="about-row">
            <span>技术栈</span>
            <b>React / TypeScript / Vite</b>
          </div>
        </div>
      </div>
    </section>
  );
}
