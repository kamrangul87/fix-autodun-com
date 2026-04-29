import { NextResponse } from 'next/server';

export function middleware(request) {
  const response = NextResponse.next();
  response.headers.set('x-vercel-skip-toolbar', '1');
  return response;
}

export const config = {
  matcher: '/:path*',
};
