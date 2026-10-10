import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isDashboardRoute = path.startsWith('/dashboard');
  const isApplyRoute = path.startsWith('/apply');

  // Next.js middleware check for client session
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/apply/:path*'],
};
