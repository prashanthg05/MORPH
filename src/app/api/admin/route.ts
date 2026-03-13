// 🔧 REPLACE YOUR ENTIRE src/app/api/admin/route.ts WITH THIS

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

    console.log('🔧 Action:', action, 'Payload:', payload);

    const turso = getTursoClient();

    // ADD_CATEGORY
    if (action === 'ADD_CATEGORY') {
      console.log('📝 Adding category:', payload.name);
      
      try {
        await turso.execute({ 
          sql: 'INSERT INTO categories (name, banner) VALUES (?, ?)', 
          args: [payload.name, payload.banner] 
        });
        console.log('✅ Category added successfully');
      } catch (dbError: any) {
        console.error('❌ Database error:', dbError.message);
        // If it's a duplicate, that's fine - just return success
        if (dbError.message.includes('UNIQUE constraint failed')) {
          console.log('ℹ️ Category already exists');
        } else {
          throw dbError;
        }
      }
    }
    
    // ADD_PRODUCT
    else if (action === 'ADD_PRODUCT') {
      console.log('📝 Adding product:', payload.name);
      
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
      console.log('✅ Product added successfully');
    } 
    
    // DELETE_PRODUCT
    else if (action === 'DELETE_PRODUCT') {
      console.log('🗑️ Deleting product:', payload.id);
      
      await turso.execute({ 
        sql: 'DELETE FROM products WHERE id = ?', 
        args: [payload.id] 
      });
      console.log('✅ Product deleted');
    } 
    
    // TOGGLE_STOCK
    else if (action === 'TOGGLE_STOCK') {
      console.log('📊 Toggling stock:', payload.id);
      
      await turso.execute({ 
        sql: 'UPDATE products SET stock = ? WHERE id = ?', 
        args: [payload.stock, payload.id] 
      });
      console.log('✅ Stock toggled');
    } 
    
    // DELETE_CATEGORY
    else if (action === 'DELETE_CATEGORY') {
      console.log('🗑️ Deleting category:', payload.name);
      
      await turso.execute({ 
        sql: 'DELETE FROM categories WHERE name = ?', 
        args: [payload.name] 
      });
      console.log('✅ Category deleted');
    } 
    
    // UPDATE_ORDER_STATUS
    else if (action === 'UPDATE_ORDER_STATUS') {
      console.log('📋 Updating order:', payload.id);
      
      await turso.execute({ 
        sql: 'UPDATE orders SET status = ? WHERE id = ?', 
        args: [payload.status, payload.id] 
      });
      console.log('✅ Order status updated');
    } 
    
    // DELETE_ORDER
    else if (action === 'DELETE_ORDER') {
      console.log('🗑️ Deleting order:', payload.id);
      
      await turso.execute({ 
        sql: 'DELETE FROM orders WHERE id = ?', 
        args: [payload.id] 
      });
      console.log('✅ Order deleted');
    } 
    
    // CLEAR_ORDERS
    else if (action === 'CLEAR_ORDERS') {
      console.log('🗑️ Clearing all orders');
      
      await turso.execute('DELETE FROM orders');
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
    console.error("Error code:", error.code);
    
    return NextResponse.json({ 
      error: error.message || "Failed to process action",
      action: body?.action
    }, { status: 500 });
  }
}
