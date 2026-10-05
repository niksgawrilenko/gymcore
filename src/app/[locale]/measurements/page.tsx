import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { deleteMeasurement } from '@/actions/misc';
import { requireUser } from '@/lib/auth';
import { getMeasurements, getTz } from '@/lib/data';
import { fmtDate } from '@/lib/dates';
import { fmtNum } from '@/lib/types';
import { MeasurementForm } from './MeasurementForm';

const PAGE = 20;
// Labels come from messages('measurements.fields'), units from messages('measurements.units').
const FIELDS = [
  ['weight', 'kg'],
  ['chest', 'cm'],
  ['waist', 'cm'],
  ['biceps', 'cm'],
  ['thighs', 'cm'],
  ['calves', 'cm'],
  ['shoulders', 'cm'],
  ['neck', 'cm'],
] as const;

export default async function MeasurementsPage({ searchParams }: PageProps<'/[locale]/measurements'>) {
  const user = await requireUser();
  const limit = Math.min(Number((await searchParams).limit) || PAGE, 1000);
  const [rows, tz] = await Promise.all([getMeasurements(user.id, limit + 1), getTz()]);
  const hasMore = rows.length > limit;
  const t = await getTranslations('measurements');
  const tc = await getTranslations('common');
  const locale = await getLocale();

  return (
    <section className="page no-nav">
      <div className="card toolbar">
        <Link href="/profile" className="back-link">
          ← {tc('back')}
        </Link>
        <h2 style={{ fontSize: 16 }}>{t('title')}</h2>
        <div style={{ width: 60 }} />
      </div>

      <MeasurementForm fields={FIELDS.map(([key, unit]) => ({ key, label: `${t(`fields.${key}`)} (${t(`units.${unit}`)})` }))} />

      {rows.length === 0 && <div className="empty-state">{t('empty')}</div>}
      {rows.slice(0, limit).map((m) => (
        <div key={m.id} className="card" style={{ padding: 15 }}>
          <div className="row-between info-row">
            <b>{m.date ? fmtDate(m.date, tz, { day: '2-digit', month: '2-digit', year: 'numeric' }, locale) : ''}</b>
            <form action={deleteMeasurement.bind(null, m.id)}>
              <button type="submit" className="ghost-btn danger-text" aria-label={tc('delete')}>
                🗑️
              </button>
            </form>
          </div>
          <div className="grid-2" style={{ gap: 5, fontSize: 14 }}>
            {FIELDS.filter(([key]) => m[key] !== null).map(([key, unit]) => (
              <div key={key}>
                {t(`fields.${key}`)}:{' '}
                <b>
                  {fmtNum(m[key])} {t(`units.${unit}`)}
                </b>
              </div>
            ))}
          </div>
        </div>
      ))}
      {hasMore && (
        <Link href={`/measurements?limit=${limit + PAGE}`} scroll={false} className="primary-btn mt" style={{ textDecoration: 'none' }}>
          {tc('showOlder')}
        </Link>
      )}
    </section>
  );
}
