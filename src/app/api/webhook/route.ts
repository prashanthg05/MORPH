import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Required for Cloudflare Pages compatibility
export const runtime = 'edge'; 

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify the request actually came from Razorpay
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSignature === signature) {
      const event = JSON.parse(body);

      // This is the worst-case scenario check
      if (event.event === 'payment.captured') {
        const paymentData = event.payload.payment.entity;
        const orderId = paymentData.order_id;

        // 🚨 CRITICAL DATABASE STEP 🚨
        // Because a webhook cannot write to localStorage, you will eventually 
        // put your database update logic right here.
        // Example: await database.updateOrder(orderId, 'Fulfilled');

        console.log("Payment captured securely in background for:", orderId);
      }

      return NextResponse.json({ status: 'ok' });
    } else {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}