import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Payment is verified and authentic
      return NextResponse.json({ message: "success", verified: true });
    } else {
      // Someone tampered with the payment
      return NextResponse.json({ message: "Invalid Signature", verified: false }, { status: 400 });
    }

  } catch (error) {
    console.error("Verification Error:", error);
    return NextResponse.json({ message: "Error verifying payment", verified: false }, { status: 500 });
  }
}