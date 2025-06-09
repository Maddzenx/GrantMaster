import { NextRequest, NextResponse } from 'next/server';

// List all routes that require authentication
const protectedRoutes = ['/dashboard', '/profile', '/settings']; // Add more as needed

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Debug: log all cookies seen by the middleware
  console.log('Middleware cookies:', request.cookies.getAll());

  // Find any cookie that matches the Supabase auth token pattern
  const hasSupabaseAuthCookie = request.cookies.getAll().some(cookie =>
    cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
  );

  // Only check protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    // If no Supabase auth cookie is present, redirect to login
    if (!hasSupabaseAuthCookie) {
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