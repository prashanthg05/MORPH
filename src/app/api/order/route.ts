import { NextResponse } from 'next/server';

// Cloudflare demands this!
export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { amount } = await request.json();

    // Use pure Edge fetch instead of the Node.js Razorpay library
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`)
      },
      body: JSON.stringify({
        amount: amount * 100, // Amount in paisa
        currency: "INR",
        receipt: "receipt_" + Math.random().toString(36).substring(7),
      })
    });

    const order = await res.json();

    if (!res.ok) {
        return NextResponse.json({ error: order }, { status: res.status });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Order Creation Error:", error);
    return NextResponse.json({ error: "Error creating order" }, { status: 500 });
  }
}