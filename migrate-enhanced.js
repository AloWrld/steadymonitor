const { query } = require('./backend/config/database');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

async function importCSV(file, table, transformFn, options = {}) {
  const filePath = path.join(__dirname, 'CSV', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file}: File not found`);
    return 0;
  }
  
  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          const transformed = transformFn(row);
          if (transformed) rows.push(transformed);
        } catch (error) {
          console.warn(`⚠️  Error transforming row in ${file}:`, error.message);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  if (rows.length === 0) {
    console.log(`ℹ️  ${file}: No rows to import`);
    return 0;
  }
  
  console.log(`📦 ${file}: ${rows.length} rows`);
  
  let imported = 0;
  for (const row of rows) {
    try {
      const cols = Object.keys(row).filter(k => row[k] !== undefined && row[k] !== null);
      if (cols.length === 0) continue;
      
      const values = cols.map(k => row[k]);
      const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i+1}`).join(',')}) ON CONFLICT DO NOTHING`;
      await query(sql, values);
      imported++;
    } catch (error) {
      console.warn(`⚠️  Error inserting row in ${file}:`, error.message);
    }
  }
  
  console.log(`✅ ${file} → ${table} (${imported} imported)`);
  return imported;
}

async function main() {
  console.log('🚀 Enhanced Migration Starting...');
  console.log('====================================');
  
  const importStats = {};
  
  // 1. Suppliers
  importStats.suppliers = await importCSV('Suppliers.csv', 'suppliers', (row) => ({
    supplier_id: row.supplier_id,
    name: row.name,
    contact: row.contact || null,
    email: row.email || null,
    products_supplied: row.products_supplied || null,
    balance: parseFloat(row.balance) || 0,
    active: row.active === 'TRUE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  // 2. Products
  importStats.products = await importCSV('products.csv', 'products', (row) => ({
    product_id: row.product_id,
    sku: row.sku,
    name: row.name,
    description: row.description || null,
    department: row.department || 'General',
    category: row.category || 'Uncategorized',
    buy_price: parseFloat(row.buy_price) || 0,
    sell_price: parseFloat(row.sell_price) || 0,
    stock_qty: parseInt(row.stock_qty) || 0,
    reorder_level: parseInt(row.reorder_level) || 5,
    supplier_id: null,
    is_allocatable: false,
    active: row.active === 'TRUE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  // 3. Customers
  importStats.customers = await importCSV('Customers.csv', 'customers', (row) => ({
    customer_id: row.customer_id,
    name: row.name,
    class: row.class,
    boarding_status: row.boarding_status || 'Day',
    program_membership: row.program_membership || null,
    parent_name: row.parent_name,
    parent_phone: row.parent_phone,
    payment_method: row.payment_method || 'installment',
    installment_status: row.installment_status || 'not_paid',
    balance: parseFloat(row.balance) || 0,
    contact: row.contact || null,
    email: row.email || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  // 4. Sales
  importStats.sales = await importCSV('Sales.csv', 'sales', (row) => ({
    sale_id: row.sale_id,
    customer_id: row.customer_id || null,
    total_amount: parseFloat(row.total_amount) || 0,
    amount_paid: parseFloat(row.amount_paid) || 0,
    balance: parseFloat(row.balance) || 0,
    payment_method: row.payment_method || 'cash',
    sale_date: row.sale_date || new Date().toISOString(),
    cashier_id: row.cashier_id || null,
    department: row.department || 'General',
    status: row.status || 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  // 5. Sale Items
  importStats.sale_items = await importCSV('Sale_Items.csv', 'sale_items', (row) => ({
    sale_id: row.sale_id,
    product_id: row.product_id,
    quantity: parseInt(row.quantity) || 1,
    unit_price: parseFloat(row.unit_price) || 0,
    subtotal: parseFloat(row.subtotal) || 0,
    created_at: new Date().toISOString()
  }));
  
  // 6. Payments
  importStats.payments = await importCSV('Payments.csv', 'payments', (row) => ({
    payment_id: row.payment_id,
    customer_id: row.customer_id || null,
    sale_id: row.sale_id || null,
    amount: parseFloat(row.amount) || 0,
    payment_method: row.payment_method || 'cash',
    payment_date: row.payment_date || new Date().toISOString(),
    notes: row.notes || null,
    created_at: new Date().toISOString()
  }));
  
  // 7. Restocks
  importStats.restocks = await importCSV('Restocks.csv', 'restocks', (row) => ({
    restock_id: row.restock_id,
    product_id: row.product_id,
    quantity: parseInt(row.quantity) || 0,
    unit_cost: parseFloat(row.unit_cost) || 0,
    total_cost: parseFloat(row.total_cost) || 0,
    supplier_id: row.supplier_id || null,
    restock_date: row.restock_date || new Date().toISOString(),
    notes: row.notes || null,
    created_at: new Date().toISOString()
  }));
  
  // 8. Refunds
  importStats.refunds = await importCSV('Refunds.csv', 'refunds', (row) => ({
    refund_id: row.refund_id,
    sale_id: row.sale_id,
    product_id: row.product_id || null,
    quantity: parseInt(row.quantity) || 0,
    amount: parseFloat(row.amount) || 0,
    reason: row.reason || null,
    refund_date: row.refund_date || new Date().toISOString(),
    processed_by: row.processed_by || null,
    created_at: new Date().toISOString()
  }));
  
  // Add more imports for other CSV files as needed...
  
  console.log('\n====================================');
  console.log('🎉 Migration Complete!');
  console.log('📊 Import Statistics:');
  Object.entries(importStats).forEach(([table, count]) => {
    console.log(`   • ${table}: ${count} records`);
  });
  console.log('====================================\n');
  
  // Verify totals
  try {
    const verification = await query(`
      SELECT 
        (SELECT COUNT(*) FROM products) as products,
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM suppliers) as suppliers,
        (SELECT COUNT(*) FROM sales) as sales
    `);
    
    console.log('✅ Database Verification:');
    console.log(`   • Products: ${verification.rows[0].products}`);
    console.log(`   • Customers: ${verification.rows[0].customers}`);
    console.log(`   • Suppliers: ${verification.rows[0].suppliers}`);
    console.log(`   • Sales: ${verification.rows[0].sales}`);
  } catch (error) {
    console.log('⚠️  Could not verify database counts');
  }
}

// Run with error handling
main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});