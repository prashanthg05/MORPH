// ✅ FINAL CORRECT - src/app/api/webhook/route.ts

import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs'; // Changed from 'edge'

function getDB(env: any): any {
  const db = env?.DB;
  if (!db) throw new Error('D1 Database not available');
  return db;
}

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    // Use Web Crypto API
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

export async function POST(request: NextRequest) {
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

    const env = (request as any).cf?.env || {};
    let db;
    if (Object.keys(env).length > 0) {
      db = getDB(env);
    } else if ((globalThis as any).DB) {
      db = (globalThis as any).DB;
    } else {
      throw new Error('Database not available');
    }

    // Handle payment events
    if (event.event === 'payment.authorized' || event.event === 'payment.captured') {
      const paymentId = event.payload?.payment?.entity?.id;
      const orderId = event.payload?.payment?.entity?.notes?.order_id;

      console.log('✅ Payment event:', event.event, paymentId);

      if (orderId) {
        await db.prepare('UPDATE orders SET status = ? WHERE id = ?')
          .bind('Payment Done', orderId)
          .run();
        console.log('📝 Order updated:', orderId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Webhook error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}