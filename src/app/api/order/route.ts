// ✅ FINAL CORRECT - src/app/api/order/route.ts

import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs'; // Changed from 'edge'

function getDB(env: any): any {
  const db = env?.DB;
  if (!db) throw new Error('D1 Database not available');
  return db;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, items, customer, email, phone, address, city, state, pincode } = body;

    console.log('📝 Creating order');

    const env = (request as any).cf?.env || {};
    let db;
    if (Object.keys(env).length > 0) {
      db = getDB(env);
    } else if ((globalThis as any).DB) {
      db = (globalThis as any).DB;
    } else {
      throw new Error('Database not available');
    }

    const orderId = Date.now().toString();
    const date = new Date().toLocaleDateString();

    // Insert order
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
    console.error("❌ Error creating order:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}