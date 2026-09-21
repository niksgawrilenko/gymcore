import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { BottomNav, LegacyHashRedirect, ThemeToggle, TzProvider } from '@/components/Chrome';
import { getTz } from '@/lib/data';
import { TZ_COOKIE } from '@/lib/dates';
import './globals.css';
import './app.css';

export const metadata: Metadata = {
  title: 'GymCore',
  description: 'Трекер тренировок',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f2f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

// Выполняется до первой отрисовки: тема без «мигания» + таймзона устройства в cookie
// (чтобы сервер форматировал даты в твоём времени, а не в UTC).
const bootScript = `
try{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}
try{var z=encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
if(z&&document.cookie.indexOf('${TZ_COOKIE}='+z)<0)document.cookie='${TZ_COOKIE}='+z+';path=/;max-age=31536000;samesite=lax'}catch(e){}
`;

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const tz = await getTz();
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <TzProvider tz={tz}>
          <header className="app-header">
            <Link href="/">
              <h1>GymCore</h1>
            </Link>
            <ThemeToggle />
          </header>
          <main className="app-content">{children}</main>
          <BottomNav />
          <LegacyHashRedirect />
        </TzProvider>
      </body>
    </html>
  );
}
