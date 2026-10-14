import type { Note, Priority, Tag, Task } from '@/types';
import { addDays, fmt, parseDate, today, todayStr } from './date';
import { TAG_ORDER } from './tags';

let seed = 20250612;
function rnd(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function pick<T>(a: T[]): T {
  return a[Math.floor(rnd() * a.length)];
}

const TITLES: Record<Tag, string[]> = {
  工作: ['写周报', '整理需求文档', '回复邮件', '项目同步会', '修复线上 Bug', '代码评审', '产品评审会', '跟进客户反馈', '梳理下季度目标'],
  学习: ['读《深度工作》30 页', '英语听力练习', '刷一道算法题', '看技术分享视频', '整理学习笔记', '背 50 个单词'],
  生活: ['买菜', '洗衣服', '缴水电费', '整理房间', '给家里打电话', '取快递', '理发'],
  健康: ['跑步 5 公里', '健身房训练', '冥想 15 分钟', '23:00 前睡觉', '喝水 2L', '拉伸 10 分钟'],
};

interface ForcedTask {
  title?: string;
  tag?: Tag;
  prio?: Priority;
  done?: boolean;
  at?: string;
}

export function generateDemoTasks(): Task[] {
  seed = 20250612;
  const tasks: Task[] = [];
  let uid = 1;

  const makeTask = (dateStr: string, done: boolean, forced?: ForcedTask) => {
    const tag = forced?.tag ?? pick(TAG_ORDER);
    const title = forced?.title ?? pick(TITLES[tag]);
    const prio =
      forced?.prio ??
      (tag === '工作'
        ? rnd() < 0.4
          ? 'high'
          : rnd() < 0.7
            ? 'mid'
            : 'low'
        : rnd() < 0.25
          ? 'high'
          : rnd() < 0.75
            ? 'mid'
            : 'low');
    let doneAt: string | null = null;
    if (done) {
      const h = forced?.at ? Number(forced.at.slice(0, 2)) : 9 + Math.floor(rnd() * 12);
      const mi = forced?.at ? Number(forced.at.slice(3, 5)) : Math.floor(rnd() * 4) * 15;
      const dt = parseDate(dateStr);
      dt.setHours(h, mi, 0, 0);
      doneAt = dt.toISOString();
    }
    tasks.push({ id: uid++, title, tag, prio, date: dateStr, done, doneAt });
  };

  const makeUnscheduled = (title: string, tag: Tag, prio: Priority, source: 'note' | 'quick' = 'note') => {
    tasks.push({
      id: uid++,
      title,
      tag,
      prio: prio ?? 'mid',
      date: null,
      done: false,
      doneAt: null,
      source,
      parsedAt: new Date().toISOString(),
    });
  };

  for (let i = 60; i >= 1; i--) {
    const ds = fmt(addDays(today(), -i));
    const n = 1 + Math.floor(rnd() * 4);
    for (let j = 0; j < n; j++) {
      makeTask(ds, rnd() < (i <= 5 ? 0.55 : 0.9));
    }
  }

  (
    [
      { title: '完成产品需求评审', tag: '工作', prio: 'high', done: true, at: '10:30' },
      { title: '修复登录页样式问题', tag: '工作', prio: 'high', done: false },
      { title: '跑步 5 公里', tag: '健康', prio: 'mid', done: true, at: '19:00' },
      { title: '读《深度工作》30 页', tag: '学习', prio: 'mid', done: false },
      { title: '整理房间', tag: '生活', prio: 'low', done: true, at: '21:00' },
      { title: '给家里打电话', tag: '生活', prio: 'low', done: false },
    ] as ForcedTask[]
  ).forEach((t) => makeTask(todayStr(), t.done!, t));

  (
    [
      { title: '季度目标拆解会', tag: '工作', prio: 'high' },
      { title: '健身房训练', tag: '健康', prio: 'mid' },
    ] as ForcedTask[]
  ).forEach((t) => makeTask(fmt(addDays(today(), 1)), false, t));

  for (let i = 2; i <= 7; i++) {
    const ds = fmt(addDays(today(), i));
    const n = Math.floor(rnd() * 3);
    for (let j = 0; j < n; j++) makeTask(ds, false);
  }

  (
    [
      { title: '把灵感本里的想法转成待办', tag: '工作', prio: 'mid' },
      { title: '研究一下新出的笔记插件', tag: '学习', prio: 'low' },
      { title: '周末试试那家新开的咖啡馆', tag: '生活', prio: 'low' },
    ] as ForcedTask[]
  ).forEach((t) => makeUnscheduled(t.title!, t.tag!, t.prio!));

  return tasks;
}

const nowISO = (offsetMin = 0) => new Date(Date.now() - offsetMin * 60000).toISOString();

export function generateDemoNotes(): Note[] {
  const raw = [
    {
      title: '项目灵感整理',
      tag: '工作' as Tag,
      createdAt: nowISO(45),
      updatedAt: nowISO(20),
      content: `把零散想法整理成可执行的计划。先聚焦最重要的几件事，不必一次把所有细节都想明白。

## 一、这次想解决什么

1. **让记录更自然** —— 想到什么就记下来，不打断思路。
2. **让待办更轻** —— 能快速创建，也能在合适的时候安排。
3. **让计划更可信** —— 只突出真正需要关注的事情。

> 少一点噪音，多一点专注。把生活慢慢整理成自己喜欢的样子。

## 二、接下来可以做的事

先完成最小的一步，再根据真实使用情况调整。好的系统不应该让整理本身变成负担。

- [x] 梳理产品核心需求
- [ ] 收集参考界面
- [ ] 完成首版配色规范`,
    },
    {
      title: '每周复盘 · 第 41 周',
      tag: '健康' as Tag,
      createdAt: nowISO(60 * 22),
      updatedAt: nowISO(60 * 20),
      content: `回顾这一周做得不错的事，也看看有哪些地方可以更从容。进步不一定很大，但值得被看见。

## 本周做得好的

- 保持了每天的**深度工作**时段
- 完成了 3 件拖了很久的事
- 运动 4 次，睡眠基本规律

## 需要调整的

- 周三、周四排得太满，容易被打断
- 有些琐事本该当天处理，却堆到了周末

## 下周的重点

1. 只设 **一个主目标**，其余都是次要
2. 每天留出一小时的缓冲时间
3. 周五下午做一次小结

> 慢慢来，把重要的事情放在心上。`,
    },
    {
      title: '阅读摘录：慢一点也没关系',
      tag: '学习' as Tag,
      createdAt: nowISO(60 * 24),
      updatedAt: nowISO(60 * 23),
      content: `真正重要的不是把每件事做快，而是知道什么值得投入。留一点空白，想法才有地方生长。

## 摘几句喜欢的话

- 「忙」常常只是逃避思考的借口。
- 决定不做什麼，和决定做什麼同样重要。
- 节奏感比速度更难得。

## 我的联想

- 排计划时不要把每一天填满，留出余量才走得远。
- ~~追求单位时间的产出~~ 更应该关注方向对不对。

## 待办

- [ ] 重读第三章并做批注
- [x] 把这段摘录归档到「学习」标签
- [ ] 写一段自己的话作为结尾`,
    },
    {
      title: '周末生活清单',
      tag: '生活' as Tag,
      createdAt: nowISO(60 * 24 * 2),
      updatedAt: nowISO(60 * 24 * 2),
      content: `买花、整理书架、去常去的咖啡店坐一会儿。生活不必总围着效率转。

## 周六

- [ ] 买一束当季的花
- [ ] 整理书架，扔掉不看的书
- [ ] 去常去的咖啡店坐一会儿

## 周日

- [ ] 给自己做一顿像样的饭
- [ ] 洗床品、开窗通风
- [ ] 早点睡，不给周一留坑

> 生活不必总围着效率转，留点时间给无用的美好。`,
    },
    {
      title: '一些还没想清楚的事',
      tag: '生活' as Tag,
      createdAt: nowISO(60 * 24 * 3),
      updatedAt: nowISO(60 * 24 * 3),
      content: `先记下来，不急着归类，也不急着找到答案。以后回头看，也许会发现新的线索。

- 要不要把工作节奏从「冲刺 + 休息」改成「稳定低速」？
- 长期来看，更想要**深度**还是**广度**？
- 如果不用向任何人交代，我最想把时间花在什么地方？

---

*这些都不着急回答，放着就好。*`,
    },
    {
      title: '产品交互细节',
      tag: '工作' as Tag,
      createdAt: nowISO(60 * 24 * 4),
      updatedAt: nowISO(60 * 24 * 4),
      content: `记录一些容易被忽略的交互细节，避免上线后返工。

## 新建与默认值

1. 新建待办默认安排到**今天**。
2. 用户没有主动选择日期时，保留「未排期」入口，避免额外负担。
3. 完成后不要立刻从视野里消失，给一个短暂的过渡动画。

## 边界情况

- 空状态要有引导文案，而不是一片空白。
- 长标题要截断，但不能截在标点前面。
- 深色模式下所有对比度都要重新检查一遍。

\`\`\`
提示：小步验证，别把整理本身变成负担。
\`\`\``,
    },
  ];

  return raw.map((n, i) => ({
    id: i + 1,
    title: n.title,
    content: n.content,
    tag: n.tag,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }));
}
