import { NextResponse } from 'next/server';

// This forces Cloudflare to fetch fresh data every time (no caching)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = process.env.DB as any;
    // Fetch all orders from D1
    const { results } = await db.prepare("SELECT * FROM orders ORDER BY id DESC").all();
    
    // Convert the items string back into an array for the frontend
    const formattedResults = results.map((order: any) => ({
      ...order,
      items: JSON.parse(order.items)
    }));

    return NextResponse.json(formattedResults);
  } catch (error) {
    console.error("DB GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const db = process.env.DB as any;
    const { id, status } = await request.json();
    
    // Update the status in D1
    await db.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, id).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = process.env.DB as any;
    const { id } = await request.json();
    
    // Delete the order from D1
    await db.prepare("DELETE FROM orders WHERE id = ?").bind(id).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}