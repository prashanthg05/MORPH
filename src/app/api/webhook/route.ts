// 🔧 REPLACE src/app/api/webhook/route.ts WITH THIS FILE
// This version uses Cloudflare D1 instead of Turso

import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'edge';

function getDB(context?: any) {
  if (typeof globalThis !== 'undefined' && (globalThis as any).DB) {
    return (globalThis as any).DB;
  }
  throw new Error('Database not available');
}

function verifySignature(body: string, signature: string, secret: string) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');

  return signature === expectedSignature;
}

export async function POST(request: Request, context?: any) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    console.log('🔔 Webhook received');

    // Verify signature
    if (!verifySignature(body, signature, secret)) {
      console.warn('⚠️ Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log('📋 Event type:', event.event);

    const db = getDB(context);

    // Handle payment.authorized
    if (event.event === 'payment.authorized') {
      const paymentId = event.payload.payment.entity.id;
      const orderId = event.payload.payment.entity.notes?.order_id;

      console.log('✅ Payment authorized:', paymentId);

      if (orderId) {
        // Update order status to Payment Done
        await db.prepare('UPDATE orders SET status = ? WHERE id = ?')
          .bind('Payment Done', orderId)
          .run();

        console.log('📝 Order updated:', orderId);
      }
    }

    // Handle payment.captured
    if (event.event === 'payment.captured') {
      const paymentId = event.payload.payment.entity.id;
      const orderId = event.payload.payment.entity.notes?.order_id;

      console.log('✅ Payment captured:', paymentId);

      if (orderId) {
        // Update order status to Payment Done
        await db.prepare('UPDATE orders SET status = ? WHERE id = ?')
          .bind('Payment Done', orderId)
          .run();

        console.log('📝 Order updated:', orderId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Webhook error:", error.message);
    return NextResponse.json({ 
      error: error.message || "Webhook processing failed" 
    }, { status: 500 });
  }
}