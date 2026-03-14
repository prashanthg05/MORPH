// ✅ TRULY FINAL CORRECT - src/app/api/order/route.ts
// Edge Runtime with proper D1 binding

import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest, context?: any) {
  try {
    const body = await request.json();
    const { amount, items, customer, email, phone, address, city, state, pincode } = body;

    const db = (context?.platform?.env?.DB || (globalThis as any).DB) as any;
    if (!db) throw new Error('D1 not available');

    const orderId = Date.now().toString();
    const date = new Date().toLocaleDateString();

    await db.prepare(
      'INSERT INTO orders (id, customer, phone, email, address, city, state, pincode, amount, status, date, items, fullItems) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      orderId, customer || '', phone || '', email || '', address || '', city || '', state || '', pincode || '',
      amount || 0, 'Awaiting Payment', date, JSON.stringify(items || []), JSON.stringify(items || [])
    ).run();

    return NextResponse.json({ success: true, orderId, amount });
  } catch (error: any) {
    console.error('❌ Order error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}