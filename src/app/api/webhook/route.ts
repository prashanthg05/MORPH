import { NextResponse } from 'next/server';

// Cloudflare demands this for Edge network compatibility
export const runtime = 'edge';

// Edge-native HMAC SHA-256 verifier
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

        // Connect to the Cloudflare D1 Database
        const db = (process.env as any).DB;

        if (db) {
            // Update the order in the database to 'Completed/Fulfilled' securely in the background
            await db.prepare("UPDATE Orders SET status = 'Fulfilled' WHERE id = ?").bind(orderId).run();
            console.log("Payment captured securely in Edge background for:", orderId);
        } else {
            console.error("Database binding not found in webhook.");
        }
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