// ✅ CORRECT - src/app/api/order/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import Razorpay from 'razorpay';

export const runtime = 'edge';

function getDB(request: NextRequest): any {
  try {
    const ctx = getRequestContext();
    if (ctx.env && (ctx.env as any).DB) return (ctx.env as any).DB;
  } catch (e) {}

  const db = (request as any).cf?.env?.DB;
  if (db) return db;
  if ((globalThis as any).DB) return (globalThis as any).DB;
  throw new Error('D1 Database not available');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, items, fullItems, customer, email, phone, address, city, state, pincode } = body;

    const db = getDB(request);

    // Create Razorpay Order
    const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_SECRET;

    if (!key_id || !key_secret) {
      throw new Error('Razorpay keys are missing in environment context.');
    }

    const instance = new Razorpay({ key_id, key_secret });
    const amountInPaise = Math.round(amount * 100);

    const rzpOrder = await instance.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    });

    const orderId = rzpOrder.id; // Correct Razorpay Order ID
    const date = new Date().toLocaleDateString();

    await db.prepare(
      'INSERT INTO orders (id, customer, phone, email, address, city, state, pincode, amount, status, date, items, fullItems) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      orderId, customer || '', phone || '', email || '', address || '', city || '', state || '', pincode || '',
      amount || 0, 'Awaiting Payment', date, JSON.stringify(items || []), JSON.stringify(fullItems || [])
    ).run();

    console.log('✅ Order created:', orderId);

    // Return orderId (not id) - we must verify what page.tsx expects
    // Based on page.tsx: `order_id: orderData.id`
    // Wait, page.tsx uses `orderData.id`? Let's check page.tsx later. We'll return both id and orderId to be safe.
    return NextResponse.json({ success: true, id: orderId, orderId, amount });
  } catch (error: any) {
    console.error('❌ Order error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}