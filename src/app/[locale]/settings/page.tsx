import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth';
import { ClearDraftButton } from './ClearDraftButton';

export default async function SettingsPage() {
  const user = await requireUser();
  const t = await getTranslations('settings');
  return (
    <section className="page no-nav">
      <div className="card toolbar">
        <Link href="/profile" className="back-link">
          ← {t('backToProfile')}
        </Link>
        <h2 style={{ fontSize: 16 }}>{t('title')}</h2>
        <div style={{ width: 60 }} />
      </div>

      <h3 className="caps" style={{ margin: '0 0 10px 5px', fontSize: 14 }}>
        {t('account')}
      </h3>
      <div className="card" style={{ padding: 15, marginBottom: 25 }}>
        <div className="row-between info-row" style={{ paddingBottom: 15, marginBottom: 15 }}>
          <span>{t('username')}</span>
          <span className="muted">{user.username}</span>
        </div>
        <div className="row-between">
          <span>{t('role')}</span>
          <span className="btn-accent" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 'bold' }}>
            {user.role === 'admin' ? t('admin') : t('user')}
          </span>
        </div>
      </div>

      <h3 className="caps" style={{ margin: '0 0 10px 5px', fontSize: 14 }}>
        {t('data')}
      </h3>
      <div className="card menu-list">
        {/* Full export of every workout (the old endpoint exported the last 10 only) */}
        <a href="/api/export" download>
          <span>{t('downloadBackup')}</span>
          <span className="muted">→</span>
        </a>
        <ClearDraftButton />
      </div>
    </section>
  );
}
