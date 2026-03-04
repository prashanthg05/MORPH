import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = await request.json();

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    
    // Check if the secret exists
    const rawSecret = process.env.RAZORPAY_KEY_SECRET;
    if (!rawSecret) {
        return NextResponse.json({ message: "Backend Error: RAZORPAY_KEY_SECRET is missing", verified: false }, { status: 400 });
    }

    // .trim() automatically removes hidden spaces that break the signature
    const secret = rawSecret.trim();

    // Using Native Web Crypto API for Cloudflare Edge
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    
    // Convert the buffer to a Hex String
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    if (expectedSignature === razorpay_signature) {
      // Signature matches! Save to Cloudflare D1 Database
      const db = process.env.DB as any;
      
      await db.prepare(
        "INSERT INTO orders (id, customer, phone, email, address, items, amount, date, status, pincode, paymentId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        orderDetails.id, 
        orderDetails.customer, 
        orderDetails.phone, 
        orderDetails.email, 
        orderDetails.address, 
        JSON.stringify(orderDetails.items), 
        orderDetails.amount, 
        orderDetails.date, 
        orderDetails.status, 
        orderDetails.pincode, 
        razorpay_payment_id
      ).run();

      return NextResponse.json({ message: "success", verified: true });
    } else {
      return NextResponse.json({ message: "Secret key does not match Razorpay signature", verified: false }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Verification/DB Error:", error);
    return NextResponse.json({ message: `Server Error: ${error.message}`, verified: false }, { status: 500 });
  }
}