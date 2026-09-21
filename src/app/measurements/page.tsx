import Link from 'next/link';
import { deleteMeasurement } from '@/actions/misc';
import { requireUser } from '@/lib/auth';
import { getMeasurements, getTz } from '@/lib/data';
import { fmtDate } from '@/lib/dates';
import { fmtNum } from '@/lib/types';
import { MeasurementForm } from './MeasurementForm';

const PAGE = 20;
const FIELDS = [
  ['weight', 'Вес', 'кг'],
  ['chest', 'Грудь', 'см'],
  ['waist', 'Талия', 'см'],
  ['biceps', 'Бицепс', 'см'],
  ['thighs', 'Бедра', 'см'],
  ['calves', 'Голень', 'см'],
  ['shoulders', 'Плечи', 'см'],
  ['neck', 'Шея', 'см'],
] as const;

export default async function MeasurementsPage({ searchParams }: PageProps<'/measurements'>) {
  const user = await requireUser();
  const limit = Math.min(Number((await searchParams).limit) || PAGE, 1000);
  const [rows, tz] = await Promise.all([getMeasurements(user.id, limit + 1), getTz()]);
  const hasMore = rows.length > limit;

  return (
    <section className="page no-nav">
      <div className="card toolbar">
        <Link href="/profile" className="back-link">
          ← Назад
        </Link>
        <h2 style={{ fontSize: 16 }}>Замеры тела</h2>
        <div style={{ width: 60 }} />
      </div>

      <MeasurementForm fields={FIELDS.map(([key, label, unit]) => ({ key, label: `${label} (${unit})` }))} />

      {rows.length === 0 && <div className="empty-state">История замеров пуста</div>}
      {rows.slice(0, limit).map((m) => (
        <div key={m.id} className="card" style={{ padding: 15 }}>
          <div className="row-between info-row">
            <b>{m.date ? fmtDate(m.date, tz, { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</b>
            <form action={deleteMeasurement.bind(null, m.id)}>
              <button type="submit" className="ghost-btn danger-text" aria-label="Удалить">
                🗑️
              </button>
            </form>
          </div>
          <div className="grid-2" style={{ gap: 5, fontSize: 14 }}>
            {FIELDS.filter(([key]) => m[key] !== null).map(([key, label, unit]) => (
              <div key={key}>
                {label}:{' '}
                <b>
                  {fmtNum(m[key])} {unit}
                </b>
              </div>
            ))}
          </div>
        </div>
      ))}
      {hasMore && (
        <Link href={`/measurements?limit=${limit + PAGE}`} scroll={false} className="primary-btn mt" style={{ textDecoration: 'none' }}>
          Показать более старые
        </Link>
      )}
    </section>
  );
}
