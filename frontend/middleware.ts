import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // /auth/callback must always pass through — it processes the incoming OAuth token
  if (pathname === '/auth/callback') {
    return NextResponse.next();
  }

  const isAuthPage = pathname === '/login' || pathname === '/register';

  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/kyc') ||
    pathname.startsWith('/agent-dashboard');
    // /pay is intentionally NOT protected here — it does its own client-side auth
    // redirect so the QR link works before login

  // 1. Pa gen token epi l ap eseye antre nan paj sekirize -> Voye l sou /login
  if (!token && isProtected) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Gen token epi l ap eseye tounen sou login/register -> Voye l sou /dashboard
  if (token && isAuthPage) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// 🔥 NOU RANGER MATCHER LAN POU L PI STAB AK TURBOPACK
export const config = {
  matcher: [
    '/login',
    '/register',
    '/auth/callback',
    '/dashboard/:path*',
    '/admin/:path*',
    '/kyc/:path*',
    '/agent-dashboard/:path*',
    '/pay',
    '/support',
    '/verify-agent',
    '/pricing',
    '/merchant',
  ],
};