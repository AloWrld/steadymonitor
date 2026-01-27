// backend/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

// Use either connection string or individual parameters
let pool;
if (process.env.DATABASE_URL) {
  // Use connection string (Render/Railway style)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  // Use individual parameters (localhost)
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'steadymonitor',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
  });
}

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

// Function to check database connection
async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection check successful');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection check failed:', error.message);
    return false;
  }
}

// Function to get database statistics
async function getDatabaseStats() {
  const client = await pool.connect();
  
  try {
    // Get list of tables
    const tablesQuery = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    // Get customers stats
    const customersStats = await client.query(`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(DISTINCT class) as unique_classes,
        COUNT(CASE WHEN boarding_status = 'Boarding' THEN 1 END) as boarding_customers,
        COUNT(CASE WHEN program_membership != 'none' THEN 1 END) as program_members
      FROM customers;
    `);

    // Get products stats - check if low_stock_alert column exists first
    let productsStats;
    try {
      // Try to get column information
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'low_stock_alert';
      `);

      if (columnCheck.rows.length > 0) {
        // Column exists, use the original query
        productsStats = await client.query(`
          SELECT 
            COUNT(*) as total_products,
            SUM(stock_qty) as total_stock,
            COUNT(CASE WHEN low_stock_alert IS NOT NULL AND stock_qty <= low_stock_alert THEN 1 END) as low_stock_items
          FROM products;
        `);
      } else {
        // Column doesn't exist, use simplified query
        productsStats = await client.query(`
          SELECT 
            COUNT(*) as total_products,
            SUM(stock_qty) as total_stock,
            0 as low_stock_items
          FROM products;
        `);
      }
    } catch (error) {
      // Fallback if any error occurs
      productsStats = await client.query(`
        SELECT 
          COUNT(*) as total_products,
          SUM(stock_qty) as total_stock
        FROM products;
      `);
    }

    // Get row counts for each table
    const tableStats = [];
    for (const table of tablesQuery.rows) {
      try {
        const rowCount = await client.query(`
          SELECT COUNT(*) as count FROM ${table.table_name};
        `);
        tableStats.push({
          table: table.table_name,
          row_count: parseInt(rowCount.rows[0].count) || 0
        });
      } catch (error) {
        tableStats.push({
          table: table.table_name,
          row_count: 0,
          error: error.message
        });
      }
    }

    return {
      tables: tableStats,
      customers: customersStats.rows[0] || {},
      products: productsStats.rows[0] || {},
      timestamp: new Date().toISOString(),
      summary: {
        total_tables: tableStats.length,
        total_customers: customersStats.rows[0]?.total_customers || 0,
        total_products: productsStats.rows[0]?.total_products || 0
      }
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { 
      error: error.message,
      timestamp: new Date().toISOString()
    };
  } finally {
    client.release();
  }
}

// Export functions
module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
  checkDatabaseConnection,
  getDatabaseStats,
  // Export pool for transactions if needed
  getPool: () => pool
};