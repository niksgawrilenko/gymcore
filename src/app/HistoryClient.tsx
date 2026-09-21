'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTz } from '@/components/Chrome';
import { confirmDiscardDraft } from '@/lib/draft';
import { dayKey, fmtDate } from '@/lib/dates';

type Item = { id: number; title: string; date: number };

const PAGE = 20;
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function HistoryClient({ workouts }: { workouts: Item[] }) {
  const tz = useTz();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [shown, setShown] = useState(PAGE);

  return (
    <section className="page">
      <div className="row-between mb" style={{ marginTop: 5 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          История
        </h2>
        <div className="view-toggle">
          <button className={`toggle-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>
            Список
          </button>
          <button className={`toggle-btn${view === 'calendar' ? ' active' : ''}`} onClick={() => setView('calendar')}>
            Календарь
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <>
          {workouts.length === 0 && <div className="empty-state">Вы еще не провели ни одной тренировки</div>}
          {workouts.slice(0, shown).map((w) => (
            <Link key={w.id} href={`/workouts/${w.id}`} className="card list-link">
              <div>
                <div className="bold" style={{ fontSize: 16, marginBottom: 4 }}>
                  {w.title}
                </div>
                <div className="muted small">
                  📅 {fmtDate(w.date, tz, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="chevron">›</div>
            </Link>
          ))}
          {shown < workouts.length && (
            <button className="primary-btn mt" onClick={() => setShown(shown + PAGE)}>
              Показать более старые
            </button>
          )}
        </>
      ) : (
        <Calendar workouts={workouts} tz={tz} />
      )}
    </section>
  );
}

function Calendar({ workouts, tz }: { workouts: Item[]; tz: string }) {
  const router = useRouter();
  const [today] = useState(() => dayKey(Date.now(), tz));
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)) - 1);
  const [selected, setSelected] = useState(today);

  // Все тренировки по дням — календарь теперь видит всю историю, а не последние 10
  const byDay = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const w of workouts) (map[dayKey(w.date, tz)] ??= []).push(w);
    return map;
  }, [workouts, tz]);

  const shiftMonth = (d: number) => {
    const m = month + d;
    setYear(year + Math.floor(m / 12));
    setMonth(((m % 12) + 12) % 12);
  };

  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Пн = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const key = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dayWorkouts = byDay[selected] ?? [];
  const [sy, sm, sd] = selected.split('-').map(Number);

  function addForDay() {
    if (!confirmDiscardDraft('У вас есть незавершенная тренировка. Если начать новую, текущая будет сброшена. Продолжить?')) return;
    const now = new Date();
    // Выбранный день + текущее время
    const ts = new Date(sy, sm - 1, sd, now.getHours(), now.getMinutes()).getTime();
    router.push(`/workout?new=1&date=${ts}`);
  }

  return (
    <>
      <div className="card" style={{ padding: '15px 10px' }}>
        <div className="calendar-header">
          <button className="icon-btn" style={{ padding: '5px 15px' }} onClick={() => shiftMonth(-1)}>
            ‹
          </button>
          <span>
            {MONTHS[month]} {year}
          </span>
          <button className="icon-btn" style={{ padding: '5px 15px' }} onClick={() => shiftMonth(1)}>
            ›
          </button>
        </div>
        <div className="calendar-grid">
          {WEEKDAYS.map((d) => (
            <div key={d} className="calendar-day-header">
              {d}
            </div>
          ))}
          {Array.from({ length: startOffset }, (_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const k = key(i + 1);
            const cls = ['calendar-day', k === today && 'today', k === selected && 'active'].filter(Boolean).join(' ');
            return (
              <div key={k} className={cls} onClick={() => setSelected(k)}>
                {i + 1}
                {byDay[k] && <div className="workout-dot" />}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 16, margin: '0 0 12px 5px' }}>
          {fmtDate(Date.UTC(sy, sm - 1, sd, 12), 'UTC', { day: 'numeric', month: 'long', year: 'numeric' })}
        </h3>
        {dayWorkouts.length === 0 && (
          <div className="empty-state" style={{ padding: 15 }}>
            В этот день тренировок не было
          </div>
        )}
        {dayWorkouts.map((w) => (
          <Link key={w.id} href={`/workouts/${w.id}`} className="card list-link done">
            <div>
              <div className="bold" style={{ fontSize: 16, marginBottom: 4 }}>
                {w.title}
              </div>
              <div className="muted small">{fmtDate(w.date, tz, { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div className="chevron">›</div>
          </Link>
        ))}
        <button className="outline-btn" onClick={addForDay}>
          + Записать тренировку на этот день
        </button>
      </div>
    </>
  );
}
