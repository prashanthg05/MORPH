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

    // Strict backend validation for delivery info
    if (!customer || !email || !phone || !address || !city || !state || !pincode) {
        throw new Error('Incomplete customer delivery information provided.');
    }

    const db = getDB(request);

    // SECURE PRICE CALCULATION
    let calculatedAmount = 0;
    let validatedItems: string[] = [];
    let validatedFullItems: any[] = [];

    if (items && Array.isArray(items) && items.length > 0) {
        const placeholders = items.map(() => '?').join(',');
        const dbProducts = await db.prepare(`SELECT * FROM products WHERE name IN (${placeholders})`).bind(...items).all();
        
        for (const itemName of items) {
           const dbItem = dbProducts.results?.find((p: any) => p.name === itemName);
           if (dbItem) {
              const priceStr = String(dbItem.price) || '0';
              const priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, '') || '0');
              calculatedAmount += priceNum;
              validatedItems.push(dbItem.name);
              validatedFullItems.push(dbItem);
           }
        }
    } else {
        throw new Error("Cart is empty or contains invalid items");
    }

    if (calculatedAmount === 0 || isNaN(calculatedAmount)) {
        throw new Error("Invalid order amount calculation");
    }

    // Create Razorpay Order
    const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_SECRET;

    if (!key_id || !key_secret) {
      throw new Error('Razorpay keys are missing in environment context.');
    }

    const instance = new Razorpay({ key_id, key_secret });
    const amountInPaise = Math.round(calculatedAmount * 100);

    const rzpOrder = await instance.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    });

    const orderId = rzpOrder.id; // Correct Razorpay Order ID
    const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    await db.prepare(
      'INSERT INTO orders (id, customer, phone, email, address, city, state, pincode, amount, status, date, items, fullItems) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      orderId, customer || '', phone || '', email || '', address || '', city || '', state || '', pincode || '',
      calculatedAmount, 'Awaiting Payment', date, JSON.stringify(validatedItems), JSON.stringify(validatedFullItems)
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