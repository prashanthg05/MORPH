// 🔧 REPLACE src/app/api/admin/route.ts WITH THIS FILE
// This version uses Cloudflare D1 instead of Turso

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'edge';

// Get database from Cloudflare environment
function getDB(context?: any) {
  // In Cloudflare Pages, the database is in context.env
  if (typeof globalThis !== 'undefined' && (globalThis as any).DB) {
    return (globalThis as any).DB;
  }
  
  throw new Error('Database not available');
}

export async function GET(request: Request, context?: any) {
  try {
    const db = getDB(context);

    console.log('📨 Admin GET request received');

    // Fetch all data
    const productsRes = await db.prepare('SELECT * FROM products').all();
    const categoriesRes = await db.prepare('SELECT * FROM categories').all();
    const ordersRes = await db.prepare('SELECT * FROM orders ORDER BY date DESC').all();

    console.log(`📦 Fetched ${productsRes.results?.length || 0} products`);
    console.log(`📂 Fetched ${categoriesRes.results?.length || 0} categories`);
    console.log(`📋 Fetched ${ordersRes.results?.length || 0} orders`);

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
      products: products,
      categories: categoriesRes.results || [],
      orders: orders
    });
  } catch (error: any) {
    console.error("❌ GET Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, context?: any) {
  let action = 'UNKNOWN';

  try {
    const body = await request.json();
    action = body.action;
    const { payload } = body;

    console.log('🔧 Action:', action, 'Payload:', payload);

    const db = getDB(context);

    // ADD_CATEGORY
    if (action === 'ADD_CATEGORY') {
      console.log('📝 Adding category:', payload.name);

      try {
        await db.prepare(
          'INSERT INTO categories (name, banner) VALUES (?, ?)'
        ).bind(payload.name, payload.banner).run();

        console.log('✅ Category added successfully');
      } catch (dbError: any) {
        console.error('❌ Database error:', dbError.message);
        if (dbError.message.includes('UNIQUE constraint')) {
          console.log('ℹ️ Category already exists');
        } else {
          throw dbError;
        }
      }
    }

    // ADD_PRODUCT
    else if (action === 'ADD_PRODUCT') {
      console.log('📝 Adding product:', payload.name);

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

      console.log('✅ Product added successfully');
    }

    // DELETE_PRODUCT
    else if (action === 'DELETE_PRODUCT') {
      console.log('🗑️ Deleting product:', payload.id);

      await db.prepare('DELETE FROM products WHERE id = ?')
        .bind(payload.id)
        .run();

      console.log('✅ Product deleted');
    }

    // TOGGLE_STOCK
    else if (action === 'TOGGLE_STOCK') {
      console.log('📊 Toggling stock:', payload.id);

      await db.prepare('UPDATE products SET stock = ? WHERE id = ?')
        .bind(payload.stock, payload.id)
        .run();

      console.log('✅ Stock toggled');
    }

    // DELETE_CATEGORY
    else if (action === 'DELETE_CATEGORY') {
      console.log('🗑️ Deleting category:', payload.name);

      await db.prepare('DELETE FROM categories WHERE name = ?')
        .bind(payload.name)
        .run();

      console.log('✅ Category deleted');
    }

    // UPDATE_ORDER_STATUS
    else if (action === 'UPDATE_ORDER_STATUS') {
      console.log('📋 Updating order:', payload.id);

      await db.prepare('UPDATE orders SET status = ? WHERE id = ?')
        .bind(payload.status, payload.id)
        .run();

      console.log('✅ Order status updated');
    }

    // DELETE_ORDER
    else if (action === 'DELETE_ORDER') {
      console.log('🗑️ Deleting order:', payload.id);

      await db.prepare('DELETE FROM orders WHERE id = ?')
        .bind(payload.id)
        .run();

      console.log('✅ Order deleted');
    }

    // CLEAR_ORDERS
    else if (action === 'CLEAR_ORDERS') {
      console.log('🗑️ Clearing all orders');

      await db.prepare('DELETE FROM orders').run();

      console.log('✅ Orders cleared');
    }

    // Unknown action
    else {
      console.error('❌ Unknown action:', action);
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    console.log('✅ Action completed successfully');
    return NextResponse.json({ success: true, action: action });
  }
  catch (error: any) {
    console.error("❌ POST Error:", error);
    console.error("Error message:", error.message);

    return NextResponse.json({
      error: error.message || "Failed to process action",
      action: action
    }, { status: 500 });
  }
}