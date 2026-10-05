// Optimistic session check before rendering + locale parsing from the URL.
// The next-intl middleware runs first: it sets/removes the locale prefix and the NEXT_LOCALE cookie,
// then we check the session and build a redirect that keeps the locale (otherwise /ru would be thrown
// to the English /login). Real authorization still happens in every page/action (requireUser).
import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

const handleI18nRouting = createMiddleware(routing);

// Public pages (paths WITHOUT the locale prefix: '/ru/login' is compared as '/login').
// SEO files (robots.txt, sitemap.xml, manifest) are filtered out by the matcher and never get here.
const PUBLIC_PREFIXES = ['/login', '/welcome', '/privacy', '/shared/'];

/** '/ru/exercises' → {path:'/exercises', prefix:'/ru'}; '/ru' → {path:'/', prefix:'/ru'}; '/x' → {path:'/x', prefix:''} */
function stripLocalePrefix(pathname: string) {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return { path: '/', prefix: `/${locale}` };
    if (pathname.startsWith(`/${locale}/`)) return { path: pathname.slice(locale.length + 1), prefix: `/${locale}` };
  }
  return { path: pathname, prefix: '' };
}

export async function proxy(request: NextRequest) {
  const i18nResponse = handleI18nRouting(request);
  // The locale redirect (307 to /ru/... and back) wins over the session check: it does not depend on auth.
  if (i18nResponse.headers.has('location')) return i18nResponse;

  const { pathname, search } = request.nextUrl;
  const { path, prefix } = stripLocalePrefix(pathname);
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    // A guest hitting the root goes to the landing page; every other address goes to login with a return path.
    const url = new URL(prefix + (path === '/' ? '/welcome' : '/login'), request.url);
    if (path !== '/') url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  if (user && path === '/login') return NextResponse.redirect(new URL(prefix || '/', request.url));
  return i18nResponse;
}

export const config = {
  // Everything except api, Next statics and files with an extension (robots.txt, sitemap.xml,
  // manifest.webmanifest, icon.png): the SEO files must not receive a locale redirect.
  matcher: ['/((?!api/|_next/|_vercel/|.*\\..*).*)'],
};
