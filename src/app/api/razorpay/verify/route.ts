import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = await request.json();

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
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
      return NextResponse.json({ message: "Invalid Signature", verified: false }, { status: 400 });
    }

  } catch (error) {
    console.error("Verification/DB Error:", error);
    return NextResponse.json({ message: "Error verifying payment", verified: false }, { status: 500 });
  }
}