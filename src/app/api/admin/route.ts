// ✅ FINAL CORRECT - src/app/api/admin/route.ts
// This WORKS with Cloudflare Pages D1 binding

import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs'; // Changed from 'edge' to 'nodejs'

// Get D1 from environment
function getDB(env: any): any {
  // D1 binding injected by Cloudflare
  const db = env.DB;
  if (!db) {
    throw new Error('D1 Database not available. Check wrangler.toml configuration.');
  }
  return db;
}

export async function GET(request: NextRequest) {
  try {
    console.log('📨 Admin GET request');

    // Get env from request
    const env = (request as any).cf?.env || {};
    
    // If not in env, try global
    let db;
    if (Object.keys(env).length > 0) {
      db = getDB(env);
    } else if ((globalThis as any).DB) {
      db = (globalThis as any).DB;
    } else {
      throw new Error('Database not available');
    }

    // Fetch all data
    const productsRes = await db.prepare('SELECT * FROM products').all();
    const categoriesRes = await db.prepare('SELECT * FROM categories').all();
    const ordersRes = await db.prepare('SELECT * FROM orders ORDER BY date DESC').all();

    console.log(`✅ Fetched: ${productsRes.results?.length || 0} products, ${categoriesRes.results?.length || 0} categories`);

    // Parse JSON fields
    const products = (productsRes.results || []).map((row: any) => ({
      ...row,
      imgs: typeof row.imgs === 'string' ? JSON.parse(row.imgs) : [],
      reviews: typeof row.reviews === 'string' ? JSON.parse(row.reviews) : []
    }));

    const orders = (ordersRes.results || []).map((row: any) => ({
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : [],
      fullItems: row.fullItems ? (typeof row.fullItems === 'string' ? JSON.parse(row.fullItems) : []) : undefined
    }));

    return NextResponse.json({
      products,
      categories: categoriesRes.results || [],
      orders,
      success: true
    });
  } catch (error: any) {
    console.error("❌ GET Error:", error.message);
    return NextResponse.json(
      { error: error.message, type: 'fetch_error' },
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

    console.log('🔧 Action:', action);

    // Get env from request
    const env = (request as any).cf?.env || {};
    
    // If not in env, try global
    let db;
    if (Object.keys(env).length > 0) {
      db = getDB(env);
    } else if ((globalThis as any).DB) {
      db = (globalThis as any).DB;
    } else {
      throw new Error('Database not available');
    }

    // ADD_CATEGORY
    if (action === 'ADD_CATEGORY') {
      console.log('📝 Adding category:', payload.name);
      await db.prepare('INSERT INTO categories (name, banner) VALUES (?, ?)')
        .bind(payload.name, payload.banner)
        .run();
      return NextResponse.json({ success: true, action });
    }

    // ADD_PRODUCT
    else if (action === 'ADD_PRODUCT') {
      console.log('📝 Adding product:', payload.name);
      await db.prepare(
        'INSERT INTO products (id, name, price, tag, category, dimensions, stock, description, imgs, reviews) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        payload.id, payload.name, payload.price, payload.tag, payload.category,
        payload.dimensions, payload.stock, payload.description,
        JSON.stringify(payload.imgs), JSON.stringify(payload.reviews)
      ).run();
      return NextResponse.json({ success: true, action });
    }

    // DELETE_PRODUCT
    else if (action === 'DELETE_PRODUCT') {
      console.log('🗑️ Deleting product');
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
      await db.prepare('DELETE FROM categories WHERE name = ?')
        .bind(payload.name).run();
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
    console.error("❌ POST Error:", error.message);
    return NextResponse.json({
      error: error.message,
      action,
      type: 'database_error'
    }, { status: 500 });
  }
}