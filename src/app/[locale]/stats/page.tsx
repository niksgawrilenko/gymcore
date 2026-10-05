import { getTranslations } from 'next-intl/server';
import { currentLocale } from '@/i18n/server';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth';
import { getStats } from '@/lib/data';
import { StatsClient } from './StatsClient';

export default async function StatsPage() {
  const user = await requireUser();
  // Before: download 100 full workouts plus the whole exercise library and compute in the browser.
  // Now: 4 aggregating SQL queries in parallel over the ENTIRE history.
  const stats = await getStats(user.id, await currentLocale());
  const t = await getTranslations('stats');
  const tc = await getTranslations('common');

  return (
    <section className="page no-nav">
      <div className="card toolbar">
        <Link href="/profile" className="back-link">
          ← {tc('back')}
        </Link>
        <h2 style={{ fontSize: 16 }}>{t('title')}</h2>
        <div style={{ width: 60 }} />
      </div>
      {stats.totalWorkouts === 0 ? (
        <div className="empty-state">{t('empty')}</div>
      ) : (
        <StatsClient stats={stats} />
      )}
    </section>
  );
}
