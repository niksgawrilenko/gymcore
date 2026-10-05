import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { localeHref } from '@/i18n/server';
import { SITE_NAME } from '@/lib/site';

// Section keys live in messages('privacy'); the markup keeps the structure only.
const STORED = ['account', 'workouts', 'media', 'cookies'] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('privacy');
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: await localeHref('/privacy') },
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations('privacy');
  return (
    <>
      <section className="mkt-section">
        <span className="mkt-eyebrow">{t('eyebrow')}</span>
        <h1 className="mkt-h1" style={{ fontSize: 'clamp(26px, 4.5vw, 40px)' }}>
          {t('h1')}
        </h1>
        <p className="mkt-lead">{t('lead', { site: SITE_NAME })}</p>
      </section>

      <section className="mkt-section">
        <h2 className="mkt-h2">{t('stored.title')}</h2>
        <ul className="mkt-bullets">
          {STORED.map((key) => (
            <li key={key}>{t(`stored.bullets.${key}`)}</li>
          ))}
        </ul>
      </section>

      <section className="mkt-section">
        <h2 className="mkt-h2">{t('aiKeys.title')}</h2>
        <p className="mkt-lead">{t('aiKeys.text')}</p>
      </section>

      <section className="mkt-section">
        <h2 className="mkt-h2">{t('purpose.title')}</h2>
        <p className="mkt-lead">{t('purpose.text')}</p>
      </section>

      <section className="mkt-section">
        <h2 className="mkt-h2">{t('publicLinks.title')}</h2>
        <p className="mkt-lead">{t('publicLinks.text')}</p>
      </section>

      <section className="mkt-section">
        <h2 className="mkt-h2">{t('retention.title')}</h2>
        <p className="mkt-lead">{t('retention.text')}</p>
      </section>

      <section className="mkt-section">
        <h2 className="mkt-h2">{t('changes.title')}</h2>
        <p className="mkt-lead">{t('changes.text')}</p>
      </section>

      <footer className="mkt-footer">
        <Link href="/welcome">{t('footerBack')}</Link>
        <Link href="/login">{t('footerLogin')}</Link>
      </footer>
    </>
  );
}
