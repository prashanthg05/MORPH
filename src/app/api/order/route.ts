// 🔧 REPLACE src/app/api/order/route.ts WITH THIS FILE
// This version uses Cloudflare D1 instead of Turso

import { NextResponse } from 'next/server';

export const runtime = 'edge';

function getDB(context?: any) {
  if (typeof globalThis !== 'undefined' && (globalThis as any).DB) {
    return (globalThis as any).DB;
  }
  throw new Error('Database not available');
}

export async function POST(request: Request, context?: any) {
  try {
    const body = await request.json();
    const { amount, items, customer, email, phone, address, city, state, pincode } = body;

    console.log('📝 Creating order');

    const db = getDB(context);
    const orderId = Date.now().toString();
    const date = new Date().toLocaleDateString();

    // Insert order into database
    await db.prepare(
      'INSERT INTO orders (id, customer, phone, email, address, city, state, pincode, amount, status, date, items, fullItems) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      orderId,
      customer || '',
      phone || '',
      email || '',
      address || '',
      city || '',
      state || '',
      pincode || '',
      amount || 0,
      'Awaiting Payment',
      date,
      JSON.stringify(items || []),
      JSON.stringify(items || [])
    ).run();

    console.log('✅ Order created:', orderId);

    return NextResponse.json({
      success: true,
      orderId: orderId,
      amount: amount
    });
  } catch (error: any) {
    console.error("❌ Error creating order:", error.message);
    return NextResponse.json({ 
      error: error.message || "Failed to create order" 
    }, { status: 500 });
  }
}