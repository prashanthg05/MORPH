import { NextResponse } from 'next/server';

// Cloudflare demands this!
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
  
  // Convert buffer to hex string to match Razorpay's format
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

        // 🚨 DATABASE UPDATE GOES HERE EVENTUALLY 🚨
        console.log("Payment captured securely in Edge background for:", orderId);
      }

      return NextResponse.json({ status: 'ok' });
    } else {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}