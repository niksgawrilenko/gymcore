import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { logout } from '@/actions/auth';
import { requireUser } from '@/lib/auth';
import { getProfileCounts } from '@/lib/data';

export default async function ProfilePage() {
  const user = await requireUser();
  const counts = await getProfileCounts(user.id);
  const t = await getTranslations('profile');

  return (
    <section className="page">
      <div className="row-between" style={{ marginBottom: 20, paddingTop: 10 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>{user.username}</h2>
        <Link href="/settings" className="icon-btn" style={{ fontSize: 20 }} aria-label={t('settings')}>
          ⚙️
        </Link>
      </div>

      <div className="row" style={{ gap: 20, marginBottom: 30 }}>
        <div className="avatar">👤</div>
        <div className="row" style={{ gap: 20 }}>
          <Counter value={counts.workouts} label={t('workouts')} />
          <Counter value={counts.exercises} label={t('myExercises')} />
          <Counter value={counts.templates} label={t('templates')} />
        </div>
      </div>

      <h3 className="caps" style={{ marginBottom: 15, fontSize: 14 }}>
        {t('dashboard')}
      </h3>
      <div className="grid-2" style={{ marginBottom: 30 }}>
        <Link href="/stats" className="card row" style={{ margin: 0, padding: 15, justifyContent: 'center', textDecoration: 'none' }}>
          <span style={{ fontSize: 20 }}>📈</span>
          <span className="bold">{t('stats')}</span>
        </Link>
        <Link href="/measurements" className="card row" style={{ margin: 0, padding: 15, justifyContent: 'center', textDecoration: 'none' }}>
          <span style={{ fontSize: 20 }}>📏</span>
          <span className="bold">{t('measurements')}</span>
        </Link>
        <Link
          href="/ai"
          className="card row"
          style={{ margin: 0, padding: 15, justifyContent: 'center', textDecoration: 'none', gridColumn: '1 / -1' }}
        >
          <span style={{ fontSize: 20 }}>🤖</span>
          <span className="bold">{t('aiCoach')}</span>
        </Link>
      </div>

      {user.role === 'admin' && (
        <Link
          href="/admin"
          className="card row"
          style={{ justifyContent: 'center', background: '#5856d6', color: '#fff', fontWeight: 'bold', padding: 16, textDecoration: 'none', marginBottom: 20 }}
        >
          <span style={{ fontSize: 20 }}>🛡️</span> {t('moderation')}
        </Link>
      )}

      <form action={logout}>
        <button type="submit" className="card danger-text" style={{ width: '100%', border: 'none', padding: 16, fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>
          {t('logout')}
        </button>
      </form>
    </section>
  );
}

function Counter({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div style={{ fontWeight: 800, fontSize: 16 }}>{value}</div>
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
    </div>
  );
}
