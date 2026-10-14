type ShortcutItem = {
  keys: string[];
  label: string;
};

type ShortcutGroup = {
  title: string;
  items: ShortcutItem[];
};

const SEPARATORS = new Set(['/', '或']);

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: '全局',
    items: [
      { keys: ['⌘', 'K'], label: '打开全局搜索，检索笔记与待办' },
      { keys: ['⌘', 'N'], label: '新建笔记，直接开始写正文' },
      { keys: ['⌘', 'I'], label: '新建待办，跳到计划页并展开输入框' },
    ],
  },
  {
    title: '计划页',
    items: [
      { keys: ['Enter'], label: '提交并创建任务' },
      { keys: ['Shift', 'Enter'], label: '在任务内换行' },
      { keys: ['Esc'], label: '收起待办输入框' },
    ],
  },
  {
    title: '笔记页',
    items: [
      { keys: ['⌘', 'E'], label: '进入编辑，光标落在正文末尾' },
      { keys: ['Esc'], label: '退出编辑 / 取消新建，回到预览' },
      { keys: ['⌘', 'F'], label: '在正文中查找' },
      { keys: ['Enter', '/', 'Shift', 'Enter'], label: '查找时跳到下一个 / 上一个匹配' },
      { keys: ['⌘', 'B'], label: '加粗选中文字' },
      { keys: ['⌘', '`'], label: '把选中文字变成行内代码' },
      { keys: ['⌘', '/'], label: '插入 / 移除代码块' },
      { keys: ['Tab', '/', 'Shift', 'Tab'], label: '增加 / 减少缩进' },
    ],
  },
  {
    title: '搜索',
    items: [{ keys: ['Esc'], label: '关闭搜索' }],
  },
];

export function HelpView() {
  return (
    <section className="page active" id="page-help">
      <div className="help-scroll">
        <div className="help-hero">
          <h2>欢迎使用 随记</h2>
          <p>Daynote · 计划 · 执行 · 回顾 · 沉淀，一站式管理你的每一天</p>
        </div>

        <div className="help-grid">
          <div className="card help-card">
            <div className="help-icon" style={{ background: 'var(--tag-work-bg)' }}>
              📅
            </div>
            <div className="help-title">计划</div>
            <div className="help-desc">
              在日历上选择任意日期，添加任务、设置标签、随时改期，逾期任务可以一键移到今天。
            </div>
          </div>
          <div className="card help-card">
            <div className="help-icon" style={{ background: 'var(--tag-study-bg)' }}>
              📝
            </div>
            <div className="help-title">笔记</div>
            <div className="help-desc">随手记录想法、会议要点、读书摘抄，支持搜索和标签筛选，输入即保存。</div>
          </div>
          <div className="card help-card">
            <div className="help-icon" style={{ background: 'var(--tag-health-bg)' }}>
              📊
            </div>
            <div className="help-title">回顾</div>
            <div className="help-desc">按今天、昨天、本周、上周、当月、上月查看完成情况，用数据了解自己的节奏。</div>
          </div>
          <div className="card help-card">
            <div className="help-icon" style={{ background: 'var(--tag-life-bg)' }}>
              ⚙️
            </div>
            <div className="help-title">设置</div>
            <div className="help-desc">切换深浅色主题、设置默认标签，导出、导入或清空你的所有数据。</div>
          </div>
        </div>

        <div className="card help-card wide">
          <div className="help-title" style={{ marginBottom: 14 }}>
            操作技巧
          </div>
          <ul className="help-list">
            <li>
              <b>快速添加任务</b> — 点计划页顶部的「+ 新建待办」展开输入框，回车即可创建
            </li>
            <li>
              <b>给未来排计划</b> — 点添加行右侧的日期，或先切换到某个日期再添加
            </li>
            <li>
              <b>任务改期</b> — 鼠标悬停任务行，点「改期」，一键选今天 / 明天 / 本周末 / 延后一周
            </li>
            <li>
              <b>批量顺延</b> — 点面板顶部「顺延未完成」，把当天未完成的任务整体挪到第二天
            </li>
            <li>
              <b>切换标签</b> — 直接点任务行上的标签，会循环切到下一个标签
            </li>
            <li>
              <b>搜索笔记</b> — 使用侧边栏品牌下方的全局搜索（⌘K），标题与正文都会匹配
            </li>
          </ul>
        </div>

        <div className="card help-card wide">
          <div className="help-title" style={{ marginBottom: 14 }}>
            键盘快捷键
          </div>
          <div className="shortcut-grid">
            {SHORTCUT_GROUPS.map((group) => (
              <div className="shortcut-group" key={group.title}>
                <div className="shortcut-group-title">{group.title}</div>
                {group.items.map((item) => (
                  <div className="shortcut-row" key={item.label}>
                    <span className="shortcut-label">{item.label}</span>
                    <span className="shortcut-keys">
                      {item.keys.map((key, i) =>
                        SEPARATORS.has(key) ? (
                          <span className="shortcut-sep" key={i}>
                            {key}
                          </span>
                        ) : (
                          <kbd key={i}>{key}</kbd>
                        ),
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="card help-card wide">
          <div className="help-title" style={{ marginBottom: 10 }}>
            常见问题
          </div>
          <div className="faq-item">
            <div className="faq-q">数据存在哪里？会上传到服务器吗？</div>
            <div className="faq-a">
              不会。任务和笔记只保存在本机（默认在用户目录的 .daynote 文件夹里），不会上传服务器。设置页「关于」中可以看到实际的存储位置；也可以随时用「导出」另存一份 JSON 备份。
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-q">换电脑后数据怎么同步？</div>
            <div className="faq-a">
              在旧设备上打开设置页，点「导出」得到一个 JSON 文件；在新设备的设置页点「导入」并选择该文件即可恢复。
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-q">为什么有些任务显示「已逾期」？</div>
            <div className="faq-a">
              任务的安排日期已经过去但还没勾选完成，就会被标记为逾期。左侧「逾期未完成」卡片里可以一键把它移到今天。
            </div>
          </div>
          <div className="faq-item">
            <div className="faq-q">任务右侧的小圆点是什么？</div>
            <div className="faq-a">代表优先级。红为高、橙为中、灰为低，会根据任务标签自动分配。</div>
          </div>
          <div className="faq-item">
            <div className="faq-q">如何切换成深色模式？</div>
            <div className="faq-a">
              进入设置页，在「外观 → 主题」里选择「深色」，也可以选「跟随系统」，让界面随操作系统自动切换。
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
