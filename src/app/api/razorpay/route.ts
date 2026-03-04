import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { amount } = await request.json();

    const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
        return NextResponse.json({ error: 'Missing API Keys in Backend' }, { status: 500 });
    }

    const basicAuth = btoa(`${key_id}:${key_secret}`);

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

    // [UPDATED] Send the key_id back to the frontend to guarantee it exists
    return NextResponse.json({ ...order, key_id: key_id });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Error creating order' }, { status: 500 });
  }
}