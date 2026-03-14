// 🔧 REPLACE src/app/api/admin/route.ts WITH THIS FILE
// Fixed: Proper D1 context handling for Cloudflare Pages

import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'edge';

// Helper to get database from global context
function getDB(): any {
  if (typeof globalThis !== 'undefined' && (globalThis as any).DB) {
    return (globalThis as any).DB;
  }
  
  // Try to access from request context
  throw new Error('D1 Database binding not found. Ensure wrangler.toml is configured correctly.');
}

export async function GET(request: NextRequest) {
  try {
    console.log('📨 Admin GET request');

    const db = getDB();

    // Fetch all data
    const productsRes = await db.prepare('SELECT * FROM products').all();
    const categoriesRes = await db.prepare('SELECT * FROM categories').all();
    const ordersRes = await db.prepare('SELECT * FROM orders ORDER BY date DESC').all();

    console.log(`✅ Fetched products: ${productsRes.results?.length || 0}`);
    console.log(`✅ Fetched categories: ${categoriesRes.results?.length || 0}`);
    console.log(`✅ Fetched orders: ${ordersRes.results?.length || 0}`);

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
      orders: orders,
      success: true
    });
  } catch (error: any) {
    console.error("❌ GET Error:", error.message);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      { 
        error: error.message,
        details: 'Failed to fetch data'
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

    console.log('🔧 Action:', action);
    console.log('📦 Payload:', JSON.stringify(payload).substring(0, 100));

    const db = getDB();

    // ADD_CATEGORY
    if (action === 'ADD_CATEGORY') {
      console.log('📝 Adding category:', payload.name, payload.banner);

      const result = await db.prepare(
        'INSERT INTO categories (name, banner) VALUES (?, ?)'
      ).bind(payload.name, payload.banner).run();

      console.log('✅ Category added:', result);

      return NextResponse.json({ 
        success: true, 
        action: action,
        message: 'Category created'
      });
    }

    // ADD_PRODUCT
    else if (action === 'ADD_PRODUCT') {
      console.log('📝 Adding product:', payload.name);

      const result = await db.prepare(
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

      console.log('✅ Product added:', result);

      return NextResponse.json({ 
        success: true, 
        action: action,
        message: 'Product created'
      });
    }

    // DELETE_PRODUCT
    else if (action === 'DELETE_PRODUCT') {
      console.log('🗑️ Deleting product:', payload.id);

      await db.prepare('DELETE FROM products WHERE id = ?')
        .bind(payload.id)
        .run();

      console.log('✅ Product deleted');

      return NextResponse.json({ 
        success: true, 
        action: action,
        message: 'Product deleted'
      });
    }

    // TOGGLE_STOCK
    else if (action === 'TOGGLE_STOCK') {
      console.log('📊 Toggling stock:', payload.id);

      await db.prepare('UPDATE products SET stock = ? WHERE id = ?')
        .bind(payload.stock, payload.id)
        .run();

      console.log('✅ Stock toggled');

      return NextResponse.json({ 
        success: true, 
        action: action,
        message: 'Stock updated'
      });
    }

    // DELETE_CATEGORY
    else if (action === 'DELETE_CATEGORY') {
      console.log('🗑️ Deleting category:', payload.name);

      await db.prepare('DELETE FROM categories WHERE name = ?')
        .bind(payload.name)
        .run();

      console.log('✅ Category deleted');

      return NextResponse.json({ 
        success: true, 
        action: action,
        message: 'Category deleted'
      });
    }

    // UPDATE_ORDER_STATUS
    else if (action === 'UPDATE_ORDER_STATUS') {
      console.log('📋 Updating order:', payload.id);

      await db.prepare('UPDATE orders SET status = ? WHERE id = ?')
        .bind(payload.status, payload.id)
        .run();

      console.log('✅ Order status updated');

      return NextResponse.json({ 
        success: true, 
        action: action,
        message: 'Order updated'
      });
    }

    // DELETE_ORDER
    else if (action === 'DELETE_ORDER') {
      console.log('🗑️ Deleting order:', payload.id);

      await db.prepare('DELETE FROM orders WHERE id = ?')
        .bind(payload.id)
        .run();

      console.log('✅ Order deleted');

      return NextResponse.json({ 
        success: true, 
        action: action,
        message: 'Order deleted'
      });
    }

    // CLEAR_ORDERS
    else if (action === 'CLEAR_ORDERS') {
      console.log('🗑️ Clearing all orders');

      await db.prepare('DELETE FROM orders').run();

      console.log('✅ Orders cleared');

      return NextResponse.json({ 
        success: true, 
        action: action,
        message: 'Orders cleared'
      });
    }

    // Unknown action
    else {
      console.error('❌ Unknown action:', action);
      return NextResponse.json({ 
        error: `Unknown action: ${action}` 
      }, { status: 400 });
    }
  }
  catch (error: any) {
    console.error("❌ POST Error:", error.message);
    console.error("Stack:", error.stack);

    return NextResponse.json({
      error: error.message || "Failed to process action",
      action: action,
      details: error.toString()
    }, { status: 500 });
  }
}
