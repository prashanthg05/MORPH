import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

    if (!webhookSecret || !signature) {
        console.error("Webhook Error: Missing secret or signature");
        return NextResponse.json({ error: "Configuration Error" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const messageData = encoder.encode(rawBody);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    if (expectedSignature !== signature) {
        console.error("Webhook Error: Invalid Signature");
        return NextResponse.json({ error: "Invalid Signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);

    if (payload.event === 'order.paid') {
        const orderId = payload.payload.payment.entity.order_id;
        const paymentId = payload.payload.payment.entity.id;

        let db: any;
        try {
            // [THE FIX] Use getCloudflareContext
            const { env } = getCloudflareContext();
            db = env.DB;
        } catch (err) {
            db = process.env.DB;
        }

        if (db) {
            await db.prepare(
                "UPDATE orders SET status = 'Pending', paymentId = ? WHERE id = ?"
            ).bind(paymentId, orderId).run();
            console.log(`[SUCCESS] Order ${orderId} verified and activated via Webhook.`);
        }
    }

    return NextResponse.json({ status: "ok" });

  } catch (error: any) {
    console.error("Webhook Exception:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}