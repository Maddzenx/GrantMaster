import { NextRequest, NextResponse } from 'next/server';

// Define routes that require authentication
const protectedRoutes = ['/dashboard', '/profile', '/grants'];

export function middleware(request: NextRequest) {
  const { cookies, nextUrl } = request;
  // Supabase sets 'sb-access-token' or 'supabase-auth-token' cookies
  const supabaseToken = cookies.get('sb-access-token') || cookies.get('supabase-auth-token');

  // If the route is protected and the user is not authenticated, redirect to login
  if (protectedRoutes.some((route) => nextUrl.pathname.startsWith(route)) && !supabaseToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Otherwise, continue
  return NextResponse.next();
}

// Specify which routes to run the middleware on
export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/grants/:path*'],
}; 