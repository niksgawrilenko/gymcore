import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { localeHref, localizedAlternates } from '@/i18n/server';
import { SITE_NAME, SITE_URL } from '@/lib/site';

// The markup holds icons and keys only; every label lives in messages('welcome').
const PAINS = [
  { key: 'notebook', icon: '🧾' },
  { key: 'excel', icon: '📊' },
  { key: 'screenshots', icon: '📱' },
] as const;

// The landing page's main pitch: free and ad-free.
const FREE = [
  { key: 'noCost', icon: '🆓' },
  { key: 'noAds', icon: '🚫' },
  { key: 'noPremium', icon: '🔓' },
] as const;

const FEATURES = [
  { key: 'journal', icon: '🏋️' },
  { key: 'history', icon: '📅' },
  { key: 'stats', icon: '📈' },
  { key: 'measurements', icon: '📐' },
  { key: 'templates', icon: '🧩' },
  { key: 'sharing', icon: '🔗' },
  { key: 'library', icon: '📚' },
  { key: 'ownership', icon: '🔒' },
] as const;

const STEPS = [
  { n: '1', key: 'account' },
  { n: '2', key: 'exercises' },
  { n: '3', key: 'log' },
  { n: '4', key: 'progress' },
] as const;

const FACTS = ['price', 'library', 'sets', 'charts', 'measurements', 'export'] as const;

const WHY = [
  { key: 'price', icon: '🆓' },
  { key: 'backup', icon: '✅' },
  { key: 'auto', icon: '⚡' },
  { key: 'mobile', icon: '📱' },
  { key: 'history', icon: '🎯' },
  { key: 'sharing', icon: '🤝' },
] as const;

const FAQ = ['free', 'card', 'internet', 'data', 'ai', 'app', 'beginner'] as const;

const AI_BULLETS = ['context', 'program', 'control', 'key'] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  // Canonical + hreflang for both locales — the landing page is the main indexed page.
  const alternates = await localizedAlternates('/welcome');
  const canonical = alternates.canonical;
  const openGraphLocale = (await getLocale()) === 'ru' ? 'ru_RU' : 'en_US';
  return {
    title: t('title'),
    description: t('description'),
    alternates,
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: SITE_NAME,
      locale: openGraphLocale,
      title: t('title'),
      description: t('description'),
    },
    twitter: { card: 'summary_large_image', title: t('title'), description: t('description') },
  };
}

export default async function WelcomePage() {
  const t = await getTranslations('welcome');
  const tMeta = await getTranslations('meta');
  const locale = await getLocale();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: SITE_NAME,
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Web',
        description: tMeta('description'),
        url: `${SITE_URL}${await localeHref('/welcome')}`,
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: locale === 'ru' ? 'RUB' : 'EUR' },
        featureList: FEATURES.map((f) => t(`features.items.${f.key}.title`)),
      },
      {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: `${SITE_URL}${await localeHref('/welcome')}`,
        inLanguage: locale,
      },
      {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map((key) => ({
          '@type': 'Question',
          name: t(`faq.items.${key}.q`),
          acceptedAnswer: { '@type': 'Answer', text: t(`faq.items.${key}.a`) },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      {/* ---------- HERO ---------- */}
      <section className="mkt-hero">
        <div>
          <span className="mkt-badge">{t('badge')}</span>
          <h1 className="mkt-h1">{t('heroTitle')}</h1>
          <p className="mkt-lead">{t('heroLead')}</p>
          <div className="mkt-cta">
            <Link href="/login?mode=register" className="btn btn-accent mkt-btn">
              {t('ctaStart')}
            </Link>
            <Link href="#how" className="btn mkt-btn">
              {t('ctaHow')}
            </Link>
          </div>
          <p className="small muted mkt-note">{t('heroNote')}</p>
        </div>

        <div className="mkt-phone" aria-hidden="true">
          <div className="mkt-phone-bar">
            <span className="mkt-phone-title">{t('preview.title')}</span>
            <span className="small muted">{t('preview.today')}</span>
          </div>
          <div className="mkt-set done">
            <span className="mkt-set-n">1</span>
            <span className="mkt-set-v">80 {t('preview.unit')}</span>
            <span className="mkt-set-r">× 8</span>
          </div>
          <div className="mkt-set done">
            <span className="mkt-set-n">2</span>
            <span className="mkt-set-v">82,5 {t('preview.unit')}</span>
            <span className="mkt-set-r">× 8</span>
          </div>
          <div className="mkt-set active">
            <span className="mkt-set-n">3</span>
            <span className="mkt-set-v">85 {t('preview.unit')}</span>
            <span className="mkt-set-r">× 6</span>
          </div>
          <div className="mkt-chart">
            {[30, 45, 38, 58, 72, 64, 84].map((h, i) => (
              <span key={i} className="mkt-bar" style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />
            ))}
          </div>
          <div className="mkt-chart-caption">
            <span>{t('preview.weight')}</span>
            <span>{t('preview.progress')}</span>
          </div>
        </div>
      </section>

      {/* ---------- FREE AND AD-FREE ---------- */}
      <section className="mkt-section">
        <div className="mkt-free">
          {FREE.map((f) => (
            <div key={f.key} className="card mkt-free-card">
              <span className="mkt-free-ico">{f.icon}</span>
              <b>{t(`free.items.${f.key}.title`)}</b>
              <span>{t(`free.items.${f.key}.text`)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- PAIN POINTS ---------- */}
      <section className="mkt-section">
        <h2 className="mkt-h2 mkt-center">{t('pains.title')}</h2>
        <div className="mkt-grid">
          {PAINS.map((p) => (
            <div key={p.key} className="card mkt-pain">
              <span className="mkt-pain-ico">{p.icon}</span>
              <b>{t(`pains.items.${p.key}.title`)}</b>
              <span>{t(`pains.items.${p.key}.text`)}</span>
            </div>
          ))}
        </div>
        <p className="mkt-turn">{t('pains.turn')}</p>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section className="mkt-section">
        <h2 className="mkt-h2">{t('features.title')}</h2>
        <div className="mkt-grid">
          {FEATURES.map((f) => (
            <div key={f.key} className="card mkt-feature">
              <span className="mkt-ico">{f.icon}</span>
              <h3 className="mkt-h3">{t(`features.items.${f.key}.title`)}</h3>
              <p>{t(`features.items.${f.key}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- AI COACH ---------- */}
      <section className="mkt-section">
        <div className="mkt-ai">
          <span className="mkt-badge">{t('ai.badge')}</span>
          <h2 className="mkt-h2" style={{ marginTop: 14 }}>
            {t('ai.title')}
          </h2>
          <p className="mkt-lead">{t('ai.lead')}</p>
          <ul className="mkt-list">
            {AI_BULLETS.map((key) => (
              <li key={key}>{t(`ai.bullets.${key}`)}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="mkt-section" id="how">
        <h2 className="mkt-h2">{t('how.title')}</h2>
        <div className="mkt-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="card mkt-step">
              <div className="mkt-step-n">{s.n}</div>
              <h3 className="mkt-h3" style={{ marginTop: 0 }}>
                {t(`how.steps.${s.key}.title`)}
              </h3>
              <p>{t(`how.steps.${s.key}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FACTS ---------- */}
      <section className="mkt-section">
        <div className="mkt-stats">
          {FACTS.map((key) => (
            <span key={key} className="mkt-stat">
              <b>{t(`facts.items.${key}.value`)}</b> {t(`facts.items.${key}.label`)}
            </span>
          ))}
        </div>
      </section>

      {/* ---------- WHY GYMCORE ---------- */}
      <section className="mkt-section">
        <h2 className="mkt-h2">{t('why.title')}</h2>
        <div className="mkt-why">
          {WHY.map((w) => (
            <div key={w.key} className="mkt-why-row">
              <span className="mkt-why-ico">{w.icon}</span>
              <span>{t(`why.items.${w.key}`)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="mkt-section">
        <h2 className="mkt-h2">{t('faq.title')}</h2>
        {FAQ.map((key) => (
          <details key={key} className="card mkt-faq">
            <summary>{t(`faq.items.${key}.q`)}</summary>
            <p>{t(`faq.items.${key}.a`)}</p>
          </details>
        ))}
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="mkt-final">
        <h2 className="mkt-h2">{t('final.title')}</h2>
        <p>{t('final.text')}</p>
        <div className="mkt-cta">
          <Link href="/login?mode=register" className="btn">
            {t('final.ctaCreate')}
          </Link>
          <Link href="/login" className="btn">
            {t('final.ctaLogin')}
          </Link>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="mkt-footer">
        <span>GymCore © {new Date().getFullYear()}</span>
        <Link href="/login">{t('footer.login')}</Link>
        <Link href="/login?mode=register">{t('footer.register')}</Link>
        <Link href="/privacy">{t('footer.privacy')}</Link>
      </footer>
    </>
  );
}
