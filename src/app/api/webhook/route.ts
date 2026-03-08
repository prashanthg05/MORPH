import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

async function verifyRazorpaySignature(body: string, signature: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('') === signature;
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 });

    const isValid = await verifyRazorpaySignature(body, signature, process.env.RAZORPAY_WEBHOOK_SECRET!);

    if (isValid) {
      const event = JSON.parse(body);
      if (event.event === 'payment.captured') {
        const orderId = event.payload.payment.entity.order_id;
        
        // FIX: Use RequestContext for D1 access
        const ctx = getRequestContext();
        const db = ctx.env.DB;

        if (db) {
            await db.prepare("UPDATE Orders SET status = 'Fulfilled' WHERE id = ?").bind(orderId).run();
        }
      }
      return NextResponse.json({ status: 'ok' });
    }
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}