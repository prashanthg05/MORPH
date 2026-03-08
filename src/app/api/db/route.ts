import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    // This is a more compatible way to grab the DB on Cloudflare
    const db = (process.env as any).DB || (request as any).context?.env?.DB;

    if (!db) {
      return NextResponse.json({ error: "DB Binding Missing" }, { status: 500 });
    }

    // --- FETCH ALL ---
    if (action === 'FETCH_ALL') {
      const { results: rawProducts } = await db.prepare("SELECT * FROM Products ORDER BY id DESC").all();
      const { results: categories } = await db.prepare("SELECT * FROM Categories").all();
      const { results: rawOrders } = await db.prepare("SELECT * FROM Orders WHERE status != 'Abandoned' ORDER BY date DESC").all();

      const products = rawProducts.map((p: any) => ({
        ...p, 
        imgs: JSON.parse(p.imgs), 
        reviews: JSON.parse(p.reviews)
      }));

      const orders = rawOrders.map((o: any) => ({
        ...o, 
        items: JSON.parse(o.items), 
        fullItems: JSON.parse(o.fullItems)
      }));

      return NextResponse.json({ products, categories, orders });
    }

    // --- CREATE CATEGORY ---
    if (action === 'CREATE_CATEGORY') {
        await db.prepare("INSERT INTO Categories (name, banner) VALUES (?, ?)").bind(payload.name, payload.banner).run();
        return NextResponse.json({ success: true });
    }

    // --- DELETE CATEGORY ---
    if (action === 'DELETE_CATEGORY') {
        await db.prepare("DELETE FROM Categories WHERE name = ?").bind(payload.name).run();
        return NextResponse.json({ success: true });
    }

    // --- CREATE PRODUCT ---
    if (action === 'CREATE_PRODUCT') {
      await db.prepare(`
        INSERT INTO Products (id, name, price, tag, imgs, dimensions, stock, description, reviews, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        payload.id, payload.name, payload.price, payload.tag,
        JSON.stringify(payload.imgs), payload.dimensions, payload.stock,
        payload.description, JSON.stringify(payload.reviews), payload.category
      ).run();
      return NextResponse.json({ success: true });
    }

    // --- CREATE ORDER ---
    if (action === 'CREATE_ORDER') {
        await db.prepare(`
          INSERT INTO Orders (id, customer, phone, email, address, city, state, items, fullItems, amount, date, status, pincode)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          payload.id, payload.customer, payload.phone, payload.email, 
          payload.address, payload.city, payload.state, 
          JSON.stringify(payload.items), JSON.stringify(payload.fullItems), 
          payload.amount, payload.date, payload.status, payload.pincode
        ).run();
        return NextResponse.json({ success: true });
    }

    // --- UPDATE/DELETE ---
    if (action === 'UPDATE_ORDER_STATUS') {
      await db.prepare("UPDATE Orders SET status = ? WHERE id = ?").bind(payload.status, payload.id).run();
      return NextResponse.json({ success: true });
    }
    if (action === 'TOGGLE_STOCK') {
      await db.prepare("UPDATE Products SET stock = ? WHERE id = ?").bind(payload.stock, payload.id).run();
      return NextResponse.json({ success: true });
    }
    if (action === 'DELETE_PRODUCT') {
      await db.prepare("DELETE FROM Products WHERE id = ?").bind(payload.id).run();
      return NextResponse.json({ success: true });
    }
    if (action === 'DELETE_ORDER') {
        await db.prepare("DELETE FROM Orders WHERE id = ?").bind(payload.id).run();
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}