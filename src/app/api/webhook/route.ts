// src/app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export const runtime = 'edge';

async function verifyRazorpaySignature(body: string, signature: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', 
    encoder.encode(secret), 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return expectedSignature === signature;
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const isValid = await verifyRazorpaySignature(
      body, 
      signature, 
      process.env.RAZORPAY_WEBHOOK_SECRET!
    );

    if (isValid) {
      const event = JSON.parse(body);

      if (event.event === 'payment.captured') {
        const paymentData = event.payload.payment.entity;
        const orderId = paymentData.order_id;

        // Update the order in Turso from "Awaiting Payment" to "Pending"
        await turso.execute({
            sql: 'UPDATE orders SET status = ? WHERE id = ?',
            args: ['Pending', orderId]
        });

        console.log("Payment captured securely! Turso updated order:", orderId);
      }

      return NextResponse.json({ status: 'ok' });
    } else {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}