// 🔧 REPLACE src/app/api/webhook/route.ts WITH THIS FILE
// Fixed: Uses Web Crypto API instead of Node.js crypto

import { NextResponse } from 'next/server';

export const runtime = 'edge';

function getDB(context?: any) {
  if (typeof globalThis !== 'undefined' && (globalThis as any).DB) {
    return (globalThis as any).DB;
  }
  throw new Error('Database not available');
}

async function verifySignature(body: string, signature: string, secret: string) {
  try {
    // Use Web Crypto API (works in Edge Runtime)
    const encoder = new TextEncoder();
    const data = encoder.encode(body);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));
    
    return signature === hashBase64;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export async function POST(request: Request, context?: any) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    console.log('🔔 Webhook received');

    // Verify signature
    const isValid = await verifySignature(body, signature, secret);
    if (!isValid) {
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