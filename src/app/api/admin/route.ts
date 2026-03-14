// ✅ TRULY FINAL CORRECT - src/app/api/admin/route.ts
// Edge Runtime with proper D1 binding access

import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'edge';

export async function GET(request: NextRequest, context?: any) {
  try {
    console.log('📨 Admin GET');
    
    // Access D1 from context or environment
    const db = (context?.platform?.env?.DB || (globalThis as any).DB) as any;
    
    if (!db) {
      throw new Error('D1 not available');
    }

    const [products, categories, orders] = await Promise.all([
      db.prepare('SELECT * FROM products').all(),
      db.prepare('SELECT * FROM categories').all(),
      db.prepare('SELECT * FROM orders ORDER BY date DESC').all()
    ]);

    const productList = (products.results || []).map((row: any) => ({
      ...row,
      imgs: typeof row.imgs === 'string' ? JSON.parse(row.imgs) : [],
      reviews: typeof row.reviews === 'string' ? JSON.parse(row.reviews) : []
    }));

    const orderList = (orders.results || []).map((row: any) => ({
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : [],
      fullItems: row.fullItems ? (typeof row.fullItems === 'string' ? JSON.parse(row.fullItems) : []) : undefined
    }));

    return NextResponse.json({
      products: productList,
      categories: categories.results || [],
      orders: orderList,
      success: true
    });
  } catch (error: any) {
    console.error('❌ GET:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context?: any) {
  let action = 'UNKNOWN';

  try {
    const body = await request.json();
    action = body.action;
    const { payload } = body;

    console.log('🔧', action);

    const db = (context?.platform?.env?.DB || (globalThis as any).DB) as any;
    
    if (!db) {
      throw new Error('D1 not available');
    }

    if (action === 'ADD_CATEGORY') {
      await db.prepare('INSERT INTO categories (name, banner) VALUES (?, ?)')
        .bind(payload.name, payload.banner).run();
      return NextResponse.json({ success: true, action });
    }

    else if (action === 'ADD_PRODUCT') {
      await db.prepare(
        'INSERT INTO products (id, name, price, tag, category, dimensions, stock, description, imgs, reviews) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        payload.id, payload.name, payload.price, payload.tag, payload.category,
        payload.dimensions, payload.stock, payload.description,
        JSON.stringify(payload.imgs), JSON.stringify(payload.reviews)
      ).run();
      return NextResponse.json({ success: true, action });
    }

    else if (action === 'DELETE_PRODUCT') {
      await db.prepare('DELETE FROM products WHERE id = ?').bind(payload.id).run();
      return NextResponse.json({ success: true, action });
    }

    else if (action === 'TOGGLE_STOCK') {
      await db.prepare('UPDATE products SET stock = ? WHERE id = ?')
        .bind(payload.stock, payload.id).run();
      return NextResponse.json({ success: true, action });
    }

    else if (action === 'DELETE_CATEGORY') {
      await db.prepare('DELETE FROM categories WHERE name = ?')
        .bind(payload.name).run();
      return NextResponse.json({ success: true, action });
    }

    else if (action === 'UPDATE_ORDER_STATUS') {
      await db.prepare('UPDATE orders SET status = ? WHERE id = ?')
        .bind(payload.status, payload.id).run();
      return NextResponse.json({ success: true, action });
    }

    else if (action === 'DELETE_ORDER') {
      await db.prepare('DELETE FROM orders WHERE id = ?').bind(payload.id).run();
      return NextResponse.json({ success: true, action });
    }

    else if (action === 'CLEAR_ORDERS') {
      await db.prepare('DELETE FROM orders').run();
      return NextResponse.json({ success: true, action });
    }

    else {
      return NextResponse.json({ error: `Unknown: ${action}` }, { status: 400 });
    }
  }
  catch (error: any) {
    console.error('❌ POST:', error.message);
    return NextResponse.json({ error: error.message, action }, { status: 500 });
  }
}