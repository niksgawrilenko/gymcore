'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * Localized error boundary for the [locale] tree: a failed query or a render error keeps the user
 * inside the app instead of showing the raw Next.js error screen. "Try again" re-renders the segment.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('errorPage');
  return (
    <section className="page no-nav">
      <div className="card center" style={{ padding: '40px 20px' }}>
        <div style={{ fontSize: 50, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ marginBottom: 10 }}>{t('title')}</h2>
        <p className="muted" style={{ marginBottom: 25 }}>
          {t('text')}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="primary-btn" onClick={reset}>
            {t('retry')}
          </button>
          <Link href="/" className="btn">
            {t('home')}
          </Link>
        </div>
      </div>
    </section>
  );
}
