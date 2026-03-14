// ✅ FINAL CORRECT - src/app/api/admin/route.ts
// Multiple D1 access methods for Cloudflare Pages

import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'edge';

// Helper to get DB from any available source
function getDB(): any {
  // Method 1: Check globalThis (Cloudflare Pages injects here)
  if ((globalThis as any).DB) {
    console.log('✅ Using DB from globalThis');
    return (globalThis as any).DB;
  }

  // Method 2: Check globalThis.env.DB (alternate path)
  if ((globalThis as any).env?.DB) {
    console.log('✅ Using DB from globalThis.env');
    return (globalThis as any).env.DB;
  }

  // If not found, throw error with debugging info
  console.error('❌ D1 not found. Available on globalThis:', Object.keys(globalThis));
  throw new Error('D1 Database binding not available in globalThis');
}

export async function GET(request: NextRequest) {
  try {
    console.log('📨 GET /api/admin');

    const db = getDB();

    // Test connection first
    const testResult = await db.prepare('SELECT 1').all();
    console.log('✅ DB connection OK');

    const products = await db.prepare('SELECT * FROM products').all();
    const categories = await db.prepare('SELECT * FROM categories').all();
    const orders = await db.prepare('SELECT * FROM orders ORDER BY date DESC').all();

    console.log(`✅ Fetched: ${products.results?.length || 0} products, ${categories.results?.length || 0} categories`);

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
    console.error('❌ GET Error:', error.message || error);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Database error',
        type: 'database_error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let action = 'UNKNOWN';

  try {
    const body = await request.json();
    action = body.action;
    const { payload } = body;

    console.log(`🔧 Action: ${action}`);

    const db = getDB();

    // ADD_CATEGORY
    if (action === 'ADD_CATEGORY') {
      console.log(`📝 Adding category: ${payload.name}`);

      await db.prepare('INSERT INTO categories (name, banner) VALUES (?, ?)')
        .bind(payload.name, payload.banner)
        .run();

      console.log('✅ Category added');

      return NextResponse.json({
        success: true,
        action,
        message: 'Category created'
      });
    }

    // ADD_PRODUCT
    else if (action === 'ADD_PRODUCT') {
      console.log(`📝 Adding product: ${payload.name}`);

      await db.prepare(
        'INSERT INTO products (id, name, price, tag, category, dimensions, stock, description, imgs, reviews) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
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
      ).run();

      console.log('✅ Product added');

      return NextResponse.json({
        success: true,
        action,
        message: 'Product created'
      });
    }

    // DELETE_PRODUCT
    else if (action === 'DELETE_PRODUCT') {
      await db.prepare('DELETE FROM products WHERE id = ?').bind(payload.id).run();
      return NextResponse.json({ success: true, action });
    }

    // TOGGLE_STOCK
    else if (action === 'TOGGLE_STOCK') {
      await db.prepare('UPDATE products SET stock = ? WHERE id = ?')
        .bind(payload.stock, payload.id).run();
      return NextResponse.json({ success: true, action });
    }

    // DELETE_CATEGORY
    else if (action === 'DELETE_CATEGORY') {
      await db.prepare('DELETE FROM categories WHERE name = ?').bind(payload.name).run();
      return NextResponse.json({ success: true, action });
    }

    // UPDATE_ORDER_STATUS
    else if (action === 'UPDATE_ORDER_STATUS') {
      await db.prepare('UPDATE orders SET status = ? WHERE id = ?')
        .bind(payload.status, payload.id).run();
      return NextResponse.json({ success: true, action });
    }

    // DELETE_ORDER
    else if (action === 'DELETE_ORDER') {
      await db.prepare('DELETE FROM orders WHERE id = ?').bind(payload.id).run();
      return NextResponse.json({ success: true, action });
    }

    // CLEAR_ORDERS
    else if (action === 'CLEAR_ORDERS') {
      await db.prepare('DELETE FROM orders').run();
      return NextResponse.json({ success: true, action });
    }

    else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  }
  catch (error: any) {
    console.error(`❌ POST Error [${action}]:`, error.message || error);
    console.error('Stack:', error.stack);

    return NextResponse.json(
      {
        error: error.message || 'Database error',
        action,
        type: 'database_error'
      },
      { status: 500 }
    );
  }
}