// ✅ FINAL - src/app/api/admin/route.ts
// Try ALL possible ways to access D1 on Cloudflare Pages

import { NextResponse, type NextRequest } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'edge';

function getDB(request: NextRequest): any {
  console.log('🔍 Looking for D1...');

  try {
    const ctx = getRequestContext();
    if (ctx.env && (ctx.env as any).DB) {
      console.log('✅ Found DB via getRequestContext().env.DB');
      return (ctx.env as any).DB;
    }
  } catch (e) {
    console.log('⚠️ getRequestContext() failed, falling back...');
  }

  // Method 1: request.cf.env.DB (standard for Pages Functions)
  if ((request as any).cf?.env?.DB) {
    console.log('✅ Found DB in request.cf.env.DB');
    return (request as any).cf.env.DB;
  }

  // Method 2: globalThis.DB (might be injected)
  if ((globalThis as any).DB) {
    console.log('✅ Found DB in globalThis.DB');
    return (globalThis as any).DB;
  }

  // Method 3: request.env (alternate path)
  if ((request as any).env?.DB) {
    console.log('✅ Found DB in request.env.DB');
    return (request as any).env.DB;
  }

  throw new Error('D1 Database binding not found. Check Cloudflare Pages D1 Bindings configuration.');
}

export async function GET(request: NextRequest) {
  try {
    console.log('📨 GET /api/admin');

    const db = getDB(request);

    const products = await db.prepare('SELECT * FROM products').all();
    const categories = await db.prepare('SELECT * FROM categories').all();
    const orders = await db.prepare("SELECT * FROM orders WHERE status != 'Awaiting Payment' ORDER BY date DESC").all();

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
    console.error('❌ GET Error:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let action = 'UNKNOWN';

  try {
    const body = await request.json();
    action = body.action;
    const { payload } = body;

    console.log(`🔧 Action: ${action}`);

    const db = getDB(request);

    if (action === 'ADD_CATEGORY') {
      console.log(`📝 Adding category: ${payload.name}`);
      await db.prepare('INSERT INTO categories (name, banner) VALUES (?, ?)')
        .bind(payload.name, payload.banner)
        .run();
      console.log('✅ Category added');
      return NextResponse.json({ success: true, action });
    }

    else if (action === 'ADD_PRODUCT') {
      console.log(`📝 Adding product: ${payload.name}`);
      await db.prepare(
        'INSERT INTO products (id, name, price, tag, category, dimensions, stock, description, imgs, reviews) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        payload.id, payload.name, payload.price, payload.tag, payload.category,
        payload.dimensions, payload.stock, payload.description,
        JSON.stringify(payload.imgs), JSON.stringify(payload.reviews)
      ).run();
      console.log('✅ Product added');
      return NextResponse.json({ success: true, action });
    }

    else if (action === 'DELETE_PRODUCT') {
      await db.prepare('DELETE FROM products WHERE CAST(id AS TEXT) = CAST(? AS TEXT)').bind(payload.id).run();
      return NextResponse.json({ success: true, action });
    }

    else if (action === 'TOGGLE_STOCK') {
      await db.prepare('UPDATE products SET stock = ? WHERE CAST(id AS TEXT) = CAST(? AS TEXT)')
        .bind(payload.stock, payload.id).run();
      return NextResponse.json({ success: true, action });
    }

    else if (action === 'DELETE_CATEGORY') {
      await db.prepare('DELETE FROM categories WHERE CAST(name AS TEXT) = CAST(? AS TEXT)').bind(payload.name).run();
      return NextResponse.json({ success: true, action });
    }

    else if (action === 'UPDATE_ORDER_STATUS') {
      await db.prepare('UPDATE orders SET status = ? WHERE CAST(id AS TEXT) = CAST(? AS TEXT)')
        .bind(payload.status, payload.id).run();
      return NextResponse.json({ success: true, action });
    }

    else if (action === 'DELETE_ORDER') {
      await db.prepare('DELETE FROM orders WHERE CAST(id AS TEXT) = CAST(? AS TEXT)').bind(payload.id).run();
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
    console.error(`❌ ${action}:`, error.message);
    return NextResponse.json({ error: error.message, action }, { status: 500 });
  }
}