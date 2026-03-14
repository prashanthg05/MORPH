// ✅ DIAGNOSTIC - src/app/api/diagnostic/route.ts
// This helps us find where D1 is actually available

import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const diagnosis: any = {
      globalDB: !!(globalThis as any).DB ? '✅ Found' : '❌ Not found',
      globalEnvDB: !!(globalThis as any).env?.DB ? '✅ Found' : '❌ Not found',
      envDirect: !!process.env.D1_MORPH_DB ? '✅ Found' : '❌ Not found',
      globalKeys: Object.keys(globalThis).filter(k => k.includes('DB') || k.includes('db') || k.includes('D1')),
      processKeys: Object.keys(process.env).filter(k => k.includes('DB') || k.includes('D1')).slice(0, 10),
    };

    console.log('DIAGNOSIS:', JSON.stringify(diagnosis, null, 2));

    return NextResponse.json(diagnosis);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}