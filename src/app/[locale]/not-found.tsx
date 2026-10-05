import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * Localized 404 for notFound() thrown inside the [locale] tree (an expired share link, an unknown
 * workout/template id). Rendered inside the layout, so the header, nav and theme stay in place.
 */
export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <section className="page no-nav">
      <div className="card center" style={{ padding: '40px 20px' }}>
        <div style={{ fontSize: 50, marginBottom: 12 }}>🔍</div>
        <h2 style={{ marginBottom: 10 }}>{t('title')}</h2>
        <p className="muted" style={{ marginBottom: 25 }}>
          {t('text')}
        </p>
        <Link href="/welcome" className="btn">
          {t('cta')}
        </Link>
      </div>
    </section>
  );
}
