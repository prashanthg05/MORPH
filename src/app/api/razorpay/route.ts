import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { amount, orderDetails } = await request.json();

    const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
        return NextResponse.json({ error: 'Missing API Keys in Backend' }, { status: 500 });
    }

    const basicAuth = btoa(`${key_id}:${key_secret}`);

    // 1. Create order in Razorpay
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), 
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      })
    });

    const order = await response.json();

    if (!response.ok) {
        console.error("Razorpay Error:", order);
        return NextResponse.json({ error: 'Razorpay API Error' }, { status: 500 });
    }

    // 2. Pre-save the order to D1 Database
    if (orderDetails) {
        let db: any;
        
        try {
            // [THE FIX] Use getCloudflareContext to grab the DB on the live server
            const { env } = getCloudflareContext() as any;
            db = env.DB;
        } catch (err) {
            // Fallback just in case you are testing locally in VS Code
            db = process.env.DB;
        }
        
        if (!db) {
             return NextResponse.json({ error: 'Database Context Missing.' }, { status: 500 });
        }

        await db.prepare(
            "INSERT INTO orders (id, customer, phone, email, address, items, amount, date, status, pincode, paymentId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
            order.id, 
            orderDetails.customer, 
            orderDetails.phone, 
            orderDetails.email, 
            orderDetails.address, 
            JSON.stringify(orderDetails.items), 
            amount, 
            new Date().toLocaleDateString(), 
            'Awaiting Payment', 
            orderDetails.pincode, 
            'PENDING_GATEWAY'
        ).run();
    }

    return NextResponse.json({ ...order, key_id: key_id });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || 'Error creating order' }, { status: 500 });
  }
}