'use client';
// App shell: theme, bottom nav, active-workout pill and legacy-link redirect.
import { useTranslations } from 'next-intl';
import { createContext, useContext, useEffect, useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useDraftMeta } from '@/lib/draft';
import { TZ_COOKIE } from '@/lib/dates';
import { THEME_COOKIE, THEME_MAX_AGE } from '@/lib/theme';

const TzContext = createContext('Europe/Warsaw');
export const useTz = () => useContext(TzContext);
export function TzProvider({ tz, children }: { tz: string; children: React.ReactNode }) {
  // Client-side only: no inline <script> because the [locale] segment remounts on language switch
  // and React 19 (dev) flags re-created scripts. Persists the device time zone for server-side date
  // formatting and migrates the legacy localStorage theme into a cookie exactly once.
  useEffect(() => {
    try {
      const z = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (z && document.cookie.indexOf(`${TZ_COOKIE}=${z}`) < 0) {
        document.cookie = `${TZ_COOKIE}=${z};path=/;max-age=31536000;samesite=lax`;
      }
    } catch {
      // Intl is unavailable in some environments — the default TZ is used server-side then.
    }
    try {
      if (document.cookie.indexOf(`${THEME_COOKIE}=`) < 0) {
        const saved = localStorage.getItem(THEME_COOKIE);
        if (saved === 'dark' || saved === 'light') {
          if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
          document.cookie = `${THEME_COOKIE}=${saved};path=/;max-age=${THEME_MAX_AGE};samesite=lax`;
        }
      }
    } catch {
      // Cookies/localStorage can be blocked — the system theme stays in effect.
    }
  }, []);
  return <TzContext.Provider value={tz}>{children}</TzContext.Provider>;
}

export function ThemeToggle() {
  const t = useTranslations('theme');
  const toggle = () => {
    // Explicit data-theme wins, otherwise the system preference (same query as the CSS media rule).
    const current =
      document.documentElement.getAttribute('data-theme') ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    // Always set an explicit data-theme (even "light") so the system media query no longer applies.
    document.documentElement.setAttribute('data-theme', next);
    // The cookie is the server's source of truth (<html data-theme> is rendered from it), so the theme
    // survives a locale switch; localStorage is only read once for the migration in TzProvider.
    document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=${THEME_MAX_AGE};samesite=lax`;
  };
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={t('toggle')}>
      🌓
    </button>
  );
}

// key — an entry in messages('nav'); labels are never hardcoded here.
const NAV = [
  { href: '/', icon: '🕒', key: 'history' },
  { href: '/templates', icon: '🏋️', key: 'workout' },
  { href: '/exercises', icon: '📚', key: 'exercises' },
  { href: '/profile', icon: '👤', key: 'profile' },
] as const;
const NAV_PATHS: readonly string[] = NAV.map((n) => n.href);

export function BottomNav() {
  const t = useTranslations('nav');
  // usePathname from @/i18n/navigation strips the locale prefix, so the comparison also works under /ru.
  const pathname = usePathname();
  if (!NAV_PATHS.includes(pathname)) return null;
  return (
    <>
      <ActivePill />
      <nav className="bottom-nav">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`nav-item${pathname === n.href ? ' active' : ''}`}>
            <span className="nav-icon">{n.icon}</span>
            <span>{t(n.key)}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

/** Elapsed time as m:ss or h:mm:ss — shared by the active-workout screen and the mini player. */
export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
}

/** Ticking clock (1 s) for the active-workout timer; disabled when there is no active workout. */
export function useNow(enabled = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [enabled]);
  return now;
}

function ActivePill() {
  const t = useTranslations('workout');
  const meta = useDraftMeta(t('freeWorkout'));
  const now = useNow(!!meta);
  const router = useRouter();
  if (!meta) return null;
  return (
    <div className="global-active-workout" onClick={() => router.push('/workout')}>
      <div className="active-workout-info">
        <span className="active-dot" />
        <div>
          <div className="active-title">{meta.title}</div>
          <div className="active-time">{formatElapsed(now - meta.start)}</div>
        </div>
      </div>
      <span className="icon-btn" style={{ color: 'var(--text-secondary)', fontSize: 20 }}>
        ↑
      </span>
    </div>
  );
}

/** Legacy links: /#shared-ex?id=… -> /shared/exercise/… */
export function LegacyHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const m = window.location.hash.match(/^#shared-(ex|template)\?id=([\w-]+)/);
    if (m) router.replace(`/shared/${m[1] === 'ex' ? 'exercise' : 'template'}/${m[2]}`);
  }, [router]);
  return null;
}
