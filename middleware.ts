import { NextRequest, NextResponse } from 'next/server';

// List all routes that require authentication
const protectedRoutes = ['/dashboard', '/profile', '/settings']; // Add more as needed

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only check protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    // Supabase sets cookies like 'sb-access-token' and 'sb-refresh-token'
    const accessToken = request.cookies.get('sb-access-token') || request.cookies.get('supabase-auth-token');

    if (!accessToken) {
      // Redirect unauthenticated users to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Allow the request to proceed
  return NextResponse.next();
}

// Optionally, limit middleware to only protected routes for performance
export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/settings/:path*'],
}; 