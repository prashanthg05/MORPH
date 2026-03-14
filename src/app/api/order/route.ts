// ✅ CORRECT - src/app/api/order/route.ts

import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'edge';

function getDB(): any {
  if ((globalThis as any).DB) return (globalThis as any).DB;
  if ((globalThis as any).env?.DB) return (globalThis as any).env.DB;
  throw new Error('D1 Database not available');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, items, customer, email, phone, address, city, state, pincode } = body;

    const db = getDB();
    const orderId = Date.now().toString();
    const date = new Date().toLocaleDateString();

    await db.prepare(
      'INSERT INTO orders (id, customer, phone, email, address, city, state, pincode, amount, status, date, items, fullItems) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      orderId, customer || '', phone || '', email || '', address || '', city || '', state || '', pincode || '',
      amount || 0, 'Awaiting Payment', date, JSON.stringify(items || []), JSON.stringify(items || [])
    ).run();

    console.log('✅ Order created:', orderId);

    return NextResponse.json({
      success: true,
      orderId,
      amount
    });
  } catch (error: any) {
    console.error('❌ Order error:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Error creating order' },
      { status: 500 }
    );
  }
}