// Оптимистичная проверка сессии до рендера: без cookie — сразу на /login.
// Настоящая проверка прав всё равно делается в каждой странице/экшене (requireUser).
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

const PUBLIC_PREFIXES = ['/login', '/shared/'];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = new URL('/login', request.url);
    if (pathname !== '/') url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  if (user && pathname === '/login') return NextResponse.redirect(new URL('/', request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icon.png|apple-icon.png|sw.js|api/).*)'],
};
