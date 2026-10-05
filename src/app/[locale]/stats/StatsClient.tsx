'use client';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { loadExerciseProgress } from '@/actions/misc';
import { useTz } from '@/components/Chrome';
import { fmtDate } from '@/lib/dates';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler);

type Stats = {
  totalSets: number;
  totalWorkouts: number;
  muscles: { label: string; sets: number }[];
  months: { month: string; count: number }[];
  exercises: { id: number; name: string; count: number }[];
};

const COLORS = ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#5856d6', '#ff2d55', '#5ac8fa', '#af52de', '#ffcc00', '#8e8e93'];
const axis = { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { color: '#888' } };
const barOpts: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { ...axis, beginAtZero: true, ticks: { color: '#888', precision: 0 } }, x: { grid: { display: false }, ticks: { color: '#888' } } },
};

export function StatsClient({ stats }: { stats: Stats }) {
  const t = useTranslations('stats');
  const tz = useTz();
  const locale = useLocale();
  const totalMuscleSets = stats.muscles.reduce((s, m) => s + m.sets, 0) || 1;
  const monthLabel = (ym: string) => fmtDate(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1, 15), 'UTC', { month: 'short', year: '2-digit' }, locale);

  return (
    <>
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card stat-tile" style={{ border: '1px solid var(--accent-color)' }}>
          <div className="value accent-text">{stats.totalSets}</div>
          <div className="caps">{t('totalSets')}</div>
        </div>
        <div className="card stat-tile" style={{ border: '1px solid #34c759' }}>
          <div className="value success-text">{stats.totalWorkouts}</div>
          <div className="caps">{t('totalWorkouts')}</div>
        </div>
      </div>

      <details className="card" open>
        <summary>{t('muscleBalance')}</summary>
        <div className="chart-box" style={{ height: 320 }}>
          <Doughnut
            data={{
              labels: stats.muscles.map((m) => `${m.label || t('other')}: ${Math.round((m.sets / totalMuscleSets) * 100)}%`),
              datasets: [{ data: stats.muscles.map((m) => m.sets), backgroundColor: COLORS, borderWidth: 0 }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom', labels: { color: '#888', padding: 12 } },
                tooltip: { callbacks: { label: (c) => ` ${t('setsDone', { count: Number(c.raw) })}` } },
              },
            }}
          />
        </div>
      </details>

      <details className="card">
        <summary>{t('activity')}</summary>
        <div className="chart-box">
          <Bar
            data={{
              labels: stats.months.map((m) => monthLabel(m.month)),
              datasets: [
                {
                  label: t('workouts'),
                  data: stats.months.map((m) => m.count),
                  backgroundColor: 'rgba(52, 199, 89, 0.6)',
                  borderColor: '#34c759',
                  borderWidth: 1,
                  borderRadius: 4,
                },
              ],
            }}
            options={barOpts}
          />
        </div>
      </details>

      <details className="card">
        <summary>{t('progress')}</summary>
        <Progress items={stats.exercises.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, locale))} tz={tz} />
      </details>

      <details className="card">
        <summary>{t('allExercises', { count: stats.exercises.length })}</summary>
        {stats.exercises.map((ex, i) => (
          <div key={ex.id} className="list-row">
            <div className="ellipsis">
              {i + 1}. {ex.name}
            </div>
            <span className="pill">{t('times', { count: ex.count })}</span>
          </div>
        ))}
      </details>
    </>
  );
}

function Progress({ items, tz }: { items: { id: number; name: string }[]; tz: string }) {
  const t = useTranslations('stats');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [selected, setSelected] = useState('');
  const [data, setData] = useState<{ date: number; maxWeight: number | null; sets: number }[]>([]);
  const [loading, startLoading] = useTransition();

  // The exercise is identified by id, not by name: the same exercise can be displayed
  // under different names (translations) without splitting its history.
  const choose = (id: string) => {
    setSelected(id);
    if (!id) return setData([]);
    startLoading(async () => setData(await loadExerciseProgress(Number(id))));
  };

  const labels = data.map((d) => fmtDate(d.date, tz, { day: 'numeric', month: 'short' }, locale));

  return (
    <>
      <select className="form-input mb" value={selected} onChange={(e) => choose(e.target.value)}>
        <option value="">{t('selectExercise')}</option>
        {items.map((it) => (
          <option key={it.id} value={it.id}>
            {it.name}
          </option>
        ))}
      </select>

      {loading && <div className="empty-state">{tc('loading')}</div>}
      {!loading && selected && data.length === 0 && <div className="empty-state">{t('noData')}</div>}
      {!loading && data.length > 0 && (
        <>
          <div className="bold small" style={{ marginBottom: 10 }}>
            {t('maxWeight')}
          </div>
          <div className="chart-box" style={{ marginBottom: 25 }}>
            <Line
              data={{
                labels,
                datasets: [
                  {
                    label: t('maxWeightLabel'),
                    data: data.map((d) => d.maxWeight),
                    borderColor: '#007aff',
                    backgroundColor: 'rgba(0, 122, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.1,
                    spanGaps: true,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: axis, x: { grid: { display: false }, ticks: { color: '#888' } } },
              }}
            />
          </div>
          <div className="bold small" style={{ marginBottom: 10 }}>
            {t('setsCount')}
          </div>
          <div className="chart-box small">
            <Bar
              data={{
                labels,
                datasets: [
                  {
                    label: t('setsLabel'),
                    data: data.map((d) => d.sets),
                    backgroundColor: 'rgba(255, 149, 0, 0.6)',
                    borderColor: '#ff9500',
                    borderWidth: 1,
                    borderRadius: 4,
                  },
                ],
              }}
              options={barOpts}
            />
          </div>
        </>
      )}
    </>
  );
}
