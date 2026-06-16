import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return NextResponse.next();

  const headers = new Headers(request.headers);
  headers.set('X-API-Key', apiKey);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: '/api/:path*',
};
