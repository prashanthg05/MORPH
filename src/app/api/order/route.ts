// src/app/api/order/route.ts
import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export const runtime = 'edge';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        // We now extract all customer details passed from the frontend
        const { amount, customer, phone, email, address, city, state, pincode, items, fullItems } = body;

        // 1. Create Razorpay Order using Edge-compatible fetch
        const auth = btoa(`${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}:${process.env.RAZORPAY_SECRET}`);
        const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: Math.round(amount * 100), // Razorpay expects paise
                currency: 'INR',
            })
        });

        if (!razorpayRes.ok) {
            throw new Error("Razorpay API error");
        }

        const order = await razorpayRes.json();

        // 2. Save the initial "Awaiting Payment" order to Turso
        // This solves the worst-case scenario if the user closes the tab!
        const date = new Date().toLocaleDateString('en-IN', { 
            day: '2-digit', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
        
        await turso.execute({
            sql: `INSERT INTO orders 
                 (id, customer, phone, email, address, city, state, pincode, amount, status, date, items, fullItems) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                order.id, 
                customer, 
                phone, 
                email, 
                address, 
                city, 
                state, 
                pincode, 
                amount, 
                'Awaiting Payment', // Temporary status
                date, 
                JSON.stringify(items), 
                JSON.stringify(fullItems)
            ]
        });

        return NextResponse.json({ id: order.id, amount: order.amount });
    } catch (error) {
        console.error("Order API Error:", error);
        return NextResponse.json({ error: "Failed to initialize order" }, { status: 500 });
    }
}