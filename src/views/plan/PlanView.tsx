import { useAppStore } from '@/store';
import { getOverdue, getPending, getUnscheduled } from '@/lib/selectors';
import { useDatePop } from './useDatePop';
import { QuickAddForm } from './QuickAddForm';
import { CalendarCard } from './CalendarCard';
import { TodayOverview } from './TodayOverview';
import { TaskPanel } from './TaskPanel';

export function PlanView() {
  const tasks = useAppStore((s) => s.tasks);
  const planView = useAppStore((s) => s.planView);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setPlanView = useAppStore((s) => s.setPlanView);
  const datePop = useDatePop();

  const overdueList = getOverdue(tasks);
  const unschedList = getUnscheduled(tasks);
  const pendingList = getPending(tasks);

  return (
    <section className="page active" id="page-plan" data-position-key={`${planView.kind}:${selectedDate}`}>
      <div className="plan-layout">
        <div className="plan-side">
          <QuickAddForm datePop={datePop} />
          <CalendarCard />
          <TodayOverview />
          <div className="metric-row">
            <button
              className={`metric-card overdue${!overdueList.length ? ' zero' : ''}${
                planView.kind === 'overdue' ? ' active' : ''
              }`}
              data-view="overdue"
              title="查看逾期未完成任务"
              onClick={() => setPlanView('overdue')}
            >
              <span className="metric-num">{overdueList.length}</span>
              <span className="metric-label">逾期</span>
            </button>
            <button
              className={`metric-card unsched${!unschedList.length ? ' zero' : ''}${
                planView.kind === 'unscheduled' ? ' active' : ''
              }`}
              data-view="unscheduled"
              title="查看待排期想法"
              onClick={() => setPlanView('unscheduled')}
            >
              <span className="metric-num">{unschedList.length}</span>
              <span className="metric-label">待排期</span>
            </button>
          </div>
          <button
            className={`pending-card${!pendingList.length ? ' zero' : ''}${
              planView.kind === 'pending' ? ' active' : ''
            }`}
            data-view="pending"
            title="查看全部待处理任务"
            onClick={() => setPlanView('pending')}
          >
            <span className="pending-label">全部待处理</span>
            <span className="pending-num">{pendingList.length}</span>
          </button>
        </div>

        <TaskPanel datePop={datePop} />
      </div>
      {datePop.host}
    </section>
  );
}
