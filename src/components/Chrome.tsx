'use client';
// «Оболочка» приложения: тема, нижняя навигация, мини-плеер активной тренировки, редирект старых ссылок.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { useDraftMeta } from '@/lib/draft';

const TzContext = createContext('Europe/Warsaw');
export const useTz = () => useContext(TzContext);
export function TzProvider({ tz, children }: { tz: string; children: React.ReactNode }) {
  return <TzContext.Provider value={tz}>{children}</TzContext.Provider>;
}

export function ThemeToggle() {
  const toggle = () => {
    const dark = document.documentElement.getAttribute('data-theme') !== 'dark';
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {}
  };
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label="Сменить тему">
      🌓
    </button>
  );
}

const NAV = [
  { href: '/', icon: '🕒', label: 'История' },
  { href: '/templates', icon: '🏋️', label: 'Тренировка' },
  { href: '/exercises', icon: '📚', label: 'Упражнения' },
  { href: '/profile', icon: '👤', label: 'Профиль' },
];
const NAV_PATHS = NAV.map((n) => n.href);

export function BottomNav() {
  const pathname = usePathname();
  if (!NAV_PATHS.includes(pathname)) return null;
  return (
    <>
      <ActivePill />
      <nav className="bottom-nav">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`nav-item${pathname === n.href ? ' active' : ''}`}>
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
}

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
  const meta = useDraftMeta();
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

/** Старые ссылки вида /#shared-ex?id=... -> /shared/exercise/... */
export function LegacyHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const m = window.location.hash.match(/^#shared-(ex|template)\?id=([\w-]+)/);
    if (m) router.replace(`/shared/${m[1] === 'ex' ? 'exercise' : 'template'}/${m[2]}`);
  }, [router]);
  return null;
}
