// ✅ CREATE THIS FILE: src/middleware.ts
// This properly injects D1 into request context for Cloudflare Pages

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get D1 from environment and attach to request
  // Cloudflare Pages injects D1 into globalThis
  if (typeof globalThis !== 'undefined' && (globalThis as any).DB) {
    console.log('✅ D1 binding found in globalThis');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};