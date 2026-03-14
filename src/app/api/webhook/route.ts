// ✅ CORRECT - src/app/api/webhook/route.ts

import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'edge';

function getDB(): any {
  if ((globalThis as any).DB) return (globalThis as any).DB;
  if ((globalThis as any).env?.DB) return (globalThis as any).env.DB;
  throw new Error('D1 Database not available');
}

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
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
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    console.log('🔔 Webhook received');

    const isValid = await verifySignature(body, signature, secret);
    if (!isValid) {
      console.warn('⚠️ Signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const db = getDB();

    if (event.event === 'payment.authorized' || event.event === 'payment.captured') {
      const orderId = event.payload?.payment?.entity?.notes?.order_id;
      if (orderId) {
        await db.prepare('UPDATE orders SET status = ? WHERE id = ?')
          .bind('Payment Done', orderId)
          .run();
        console.log('✅ Order updated:', orderId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Webhook error:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Webhook error' },
      { status: 500 }
    );
  }
}