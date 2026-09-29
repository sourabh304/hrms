import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Session cookie set (httpOnly) by the API on login. */
const SESSION_COOKIE = 'segue_rt';

/**
 * Optimistic auth gate: bounce visitors without a session cookie to /login.
 * The API remains the source of truth — an expired session is handled client-side.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = new URL('/login', request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== '/') url.searchParams.set('next', next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|careers|.*\\..*).*)'],
};
