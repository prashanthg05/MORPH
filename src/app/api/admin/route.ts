// 🚨 COPY THIS ENTIRE FILE AND REPLACE src/app/api/admin/route.ts

import { NextResponse } from 'next/server';
import { getTursoClient } from '@/lib/turso';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'edge';

export async function GET() {
  try {
    const turso = getTursoClient();
    
    const productsRes = await turso.execute('SELECT * FROM products');
    const categoriesRes = await turso.execute('SELECT * FROM categories');
    const ordersRes = await turso.execute('SELECT * FROM orders ORDER BY date DESC');

    const products = productsRes.rows.map((row: any) => ({
      ...row,
      imgs: typeof row.imgs === 'string' ? JSON.parse(row.imgs) : [],
      reviews: typeof row.reviews === 'string' ? JSON.parse(row.reviews) : []
    }));

    const orders = ordersRes.rows.map((row: any) => ({
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : [],
      fullItems: row.fullItems ? (typeof row.fullItems === 'string' ? JSON.parse(row.fullItems) : []) : undefined
    }));

    return NextResponse.json({
      products: products,
      categories: categoriesRes.rows,
      orders: orders
    });
  } catch (error: any) {
    console.error("❌ GET Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    const turso = getTursoClient();

    if (action === 'ADD_PRODUCT') {
      await turso.execute({
        sql: 'INSERT INTO products (id, name, price, tag, category, dimensions, stock, description, imgs, reviews) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          payload.id, 
          payload.name, 
          payload.price, 
          payload.tag, 
          payload.category, 
          payload.dimensions, 
          payload.stock, 
          payload.description, 
          JSON.stringify(payload.imgs), 
          JSON.stringify(payload.reviews)
        ]
      });
    } 
    else if (action === 'DELETE_PRODUCT') {
      await turso.execute({ 
        sql: 'DELETE FROM products WHERE id = ?', 
        args: [payload.id] 
      });
    } 
    else if (action === 'TOGGLE_STOCK') {
      await turso.execute({ 
        sql: 'UPDATE products SET stock = ? WHERE id = ?', 
        args: [payload.stock, payload.id] 
      });
    } 
    else if (action === 'ADD_CATEGORY') {
      await turso.execute({ 
        sql: 'INSERT INTO categories (name, banner) VALUES (?, ?)', 
        args: [payload.name, payload.banner] 
      });
    } 
    else if (action === 'DELETE_CATEGORY') {
      await turso.execute({ 
        sql: 'DELETE FROM categories WHERE name = ?', 
        args: [payload.name] 
      });
    } 
    else if (action === 'UPDATE_ORDER_STATUS') {
      await turso.execute({ 
        sql: 'UPDATE orders SET status = ? WHERE id = ?', 
        args: [payload.status, payload.id] 
      });
    } 
    else if (action === 'DELETE_ORDER') {
      await turso.execute({ 
        sql: 'DELETE FROM orders WHERE id = ?', 
        args: [payload.id] 
      });
    } 
    else if (action === 'CLEAR_ORDERS') {
      await turso.execute('DELETE FROM orders');
    }

    return NextResponse.json({ success: true });
  } 
  catch (error: any) {
    console.error("❌ POST Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}