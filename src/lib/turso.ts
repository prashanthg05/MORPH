// 🔧 REPLACE src/lib/turso.ts WITH THIS FILE
// Fixed: No external type imports needed

// This file connects to Cloudflare D1 instead of Turso
// D1 is built into Cloudflare - no external dependency needed!

// Get the D1 database binding
export function getDatabase(env?: any): any {
  // For Cloudflare Workers/Pages
  if (typeof globalThis !== 'undefined' && (globalThis as any).DB) {
    return (globalThis as any).DB;
  }

  // For local development or if env passed
  if (env?.DB) {
    return env.DB;
  }

  throw new Error('D1 Database binding not found. Make sure wrangler.toml is configured correctly.');
}

// Wrapper function to make it compatible with existing code
export async function executeTursoQuery(sql: string, args: any[] = []): Promise<any> {
  try {
    const db = getDatabase();
    const stmt = db.prepare(sql);
    
    if (args.length > 0) {
      return await stmt.bind(...args).all();
    }
    
    return await stmt.all();
  } catch (error) {
    console.error('D1 Query Error:', error);
    throw error;
  }
}

// Also export a compatible object for the existing code structure
export const tursoClient = {
  execute: async (sql: string | { sql: string; args?: any[] }, args?: any[]) => {
    try {
      const db = getDatabase();
      
      let query: string;
      let queryArgs: any[] = [];

      if (typeof sql === 'string') {
        query = sql;
        queryArgs = args || [];
      } else {
        query = sql.sql;
        queryArgs = sql.args || [];
      }

      const stmt = db.prepare(query);
      
      if (queryArgs.length > 0) {
        return await stmt.bind(...queryArgs).all();
      }
      
      return await stmt.all();
    } catch (error) {
      console.error('D1 Query Error:', error);
      throw error;
    }
  }
};

// Export for backward compatibility
export const getTursoClient = () => tursoClient;