import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/auth/callback';
  
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/kyc') ||
    pathname.startsWith('/agent-dashboard');

  // 1. Pa gen token epi l ap eseye antre nan paj sekirize -> Voye l sou /login
  if (!token && isProtected) {
    const loginUrl = new URL('/login', request.url);
    // Sa evite pou Next.js pa kenbe ansyen kach chimen an
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
  ],
};