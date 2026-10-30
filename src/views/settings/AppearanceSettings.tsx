import { useAppStore } from '@/store';
import { toast } from '@/lib/toast';
import type { ThemePalette } from '@/types';

const palettes = [
  { id: 'warm', label: '暖色', description: '奶油纸感 · 陶土暖橙' },
  { id: 'morandi', label: '磨玻璃', description: '莫兰迪色 · 轻透柔雾' },
] as const;

const modes = [
  { id: 'light', label: '浅色', description: '明亮清晰', icon: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> },
  { id: 'dark', label: '深色', description: '柔和暗调', icon: <path d="M20 14a8.5 8.5 0 0 1-10-10A8.5 8.5 0 1 0 20 14Z" /> },
  { id: 'system', label: '跟随系统', description: '自动适配明暗', icon: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></> },
] as const;

function ThemePreview({ palette }: { palette: ThemePalette }) {
  return (
    <span className={`theme-preview ${palette}`} aria-hidden="true">
      <span className="preview-nav">
        <i className="preview-brand" />
        <i className="preview-nav-line selected" />
        <i className="preview-nav-line" /><i className="preview-nav-line" />
        <i className="preview-nav-foot" />
      </span>
      <span className="preview-content">
        <i className="preview-heading" />
        {[0, 1, 2].map(i => <span key={i} className="preview-task"><i /><b /></span>)}
        <span className="preview-bottom"><i /><i /></span>
      </span>
    </span>
  );
}

function SelectionCheck() {
  return <span className="appearance-check" aria-hidden="true">✓</span>;
}

export function AppearanceSettings() {
  const settings = useAppStore(s => s.settings);
  const setTheme = useAppStore(s => s.setTheme);
  const setPalette = useAppStore(s => s.setPalette);

  return (
    <div className="card setting-card appearance-card">
      <div className="appearance-heading">
        <div className="setting-title">外观</div>
        <p>选一种喜欢的风格，让记录更自在。</p>
      </div>
      <div className="appearance-section">
        <div className="appearance-section-head">
          <span className="setting-label">主题风格</span><span className="appearance-hint">配色与材质</span>
        </div>
        <div className="theme-options" id="paletteSeg" role="group" aria-label="主题风格">
          {palettes.map(palette => (
            <button key={palette.id} type="button"
              className={`seg-btn appearance-option theme-option${settings.palette === palette.id ? ' active' : ''}`}
              data-palette={palette.id} aria-pressed={settings.palette === palette.id}
              onClick={() => { setPalette(palette.id); toast(`主题风格已切换为「${palette.label}」`); }}>
              <ThemePreview palette={palette.id} />
              <span className="theme-option-info">
                <span><strong>{palette.label}</strong><small>{palette.description}</small></span>
                <SelectionCheck />
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="appearance-section">
        <div className="appearance-section-head">
          <span className="setting-label">显示模式</span><span className="appearance-hint">选择适合此刻的明暗</span>
        </div>
        <div className="mode-options" id="themeSeg" role="group" aria-label="显示模式">
          {modes.map(mode => (
            <button key={mode.id} type="button"
              className={`seg-btn appearance-option mode-option${settings.theme === mode.id ? ' active' : ''}`}
              data-theme={mode.id} aria-pressed={settings.theme === mode.id}
              onClick={() => { setTheme(mode.id); toast(`显示模式已切换为「${mode.label}」`); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{mode.icon}</svg>
              <span className="mode-option-info"><strong>{mode.label}</strong><small>{mode.description}</small></span>
              <SelectionCheck />
            </button>
          ))}
        </div>
      </div>
      <p className="appearance-footnote">选择后即时生效，并自动保存</p>
    </div>
  );
}
