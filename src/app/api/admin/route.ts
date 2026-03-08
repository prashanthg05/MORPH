// src/app/api/admin/route.ts
import { NextResponse } from 'next/server';
import { getTursoClient } from '@/lib/turso';

// 🚨 CRITICAL FIX: This forces Next.js to fetch fresh data every time you refresh!
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'edge';

export async function GET() {
  try {
    const turso = getTursoClient(); // Connects fresh
    const productsRes = await turso.execute('SELECT * FROM products');
    const categoriesRes = await turso.execute('SELECT * FROM categories');
    const ordersRes = await turso.execute('SELECT * FROM orders ORDER BY date DESC');

    // Convert the stringified JSON back into arrays/objects for the frontend
    const products = productsRes.rows.map(row => ({
      ...row,
      imgs: JSON.parse(row.imgs as string),
      reviews: JSON.parse(row.reviews as string)
    }));

    const orders = ordersRes.rows.map(row => ({
      ...row,
      items: JSON.parse(row.items as string),
      fullItems: row.fullItems ? JSON.parse(row.fullItems as string) : undefined
    }));

    return NextResponse.json({
      products: products,
      categories: categoriesRes.rows,
      orders: orders
    });
  } catch (error) {
    console.error("Turso GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch admin data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const turso = getTursoClient(); // Connects fresh
    const body = await req.json();
    const { action, payload } = body;

    if (action === 'ADD_PRODUCT') {
      await turso.execute({
        sql: 'INSERT INTO products (id, name, price, tag, category, dimensions, stock, description, imgs, reviews) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [payload.id, payload.name, payload.price, payload.tag, payload.category, payload.dimensions, payload.stock, payload.description, JSON.stringify(payload.imgs), JSON.stringify(payload.reviews)]
      });
    } else if (action === 'DELETE_PRODUCT') {
      await turso.execute({ sql: 'DELETE FROM products WHERE id = ?', args: [payload.id] });
    } else if (action === 'TOGGLE_STOCK') {
      await turso.execute({ sql: 'UPDATE products SET stock = ? WHERE id = ?', args: [payload.stock, payload.id] });
    } else if (action === 'ADD_CATEGORY') {
      await turso.execute({ sql: 'INSERT INTO categories (name, banner) VALUES (?, ?)', args: [payload.name, payload.banner] });
    } else if (action === 'DELETE_CATEGORY') {
      await turso.execute({ sql: 'DELETE FROM categories WHERE name = ?', args: [payload.name] });
    } else if (action === 'UPDATE_ORDER_STATUS') {
      await turso.execute({ sql: 'UPDATE orders SET status = ? WHERE id = ?', args: [payload.status, payload.id] });
    } else if (action === 'DELETE_ORDER') {
      await turso.execute({ sql: 'DELETE FROM orders WHERE id = ?', args: [payload.id] });
    } else if (action === 'CLEAR_ORDERS') {
      await turso.execute('DELETE FROM orders');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Turso POST Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update admin data" }, { status: 500 });
  }
}