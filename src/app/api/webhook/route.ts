// ✅ CORRECT - src/app/api/webhook/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

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

    const isValid = await verifySignature(body, signature, secret);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const db = getDB(request);

    if (event.event === 'payment.authorized' || event.event === 'payment.captured') {
      const orderId = event.payload?.payment?.entity?.order_id || event.payload?.payment?.entity?.notes?.order_id;
      if (orderId) {
        await db.prepare('UPDATE orders SET status = ? WHERE id = ?')
          .bind('Pending', orderId)
          .run();
        console.log('✅ Order updated to Pending:', orderId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Webhook error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}