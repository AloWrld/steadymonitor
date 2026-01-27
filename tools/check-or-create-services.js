#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const backendServicesDir = path.join(projectRoot, 'backend', 'services');

console.log('🔍 Checking service files...\n');

// List of expected service files based on route files
const expectedServices = [
    'allocationService.js',
    'authService.js',
    'checkoutService.js',
    'customerService.js',
    'dashboardService.js',
    'inventoryService.js',
    'paymentService.js',
    'pocketMoneyService.js',
    'posService.js',
    'printService.js',
    'refundService.js',
    'reportService.js',
    'supplierService.js'
];

console.log('Checking which service files exist:');
console.log('='.repeat(60));

const existingServices = fs.readdirSync(backendServicesDir).filter(f => f.endsWith('.js'));
const missingServices = [];

expectedServices.forEach(service => {
    if (existingServices.includes(service)) {
        console.log(`✅ ${service}`);
    } else {
        console.log(`❌ ${service} - MISSING`);
        missingServices.push(service);
    }
});

console.log('='.repeat(60));

// Check specifically for dashboardService
if (missingServices.includes('dashboardService.js')) {
    console.log('\n🔄 Creating dashboardService.js...');
    
    const dashboardServicePath = path.join(backendServicesDir, 'dashboardService.js');
    
    const dashboardServiceContent = `const { query } = require('../config/database');

class DashboardService {
    
    async getDashboardStats() {
        try {
            // Get total products count
            const productsResult = await query('SELECT COUNT(*) as total_products FROM products');
            
            // Get total customers count
            const customersResult = await query('SELECT COUNT(*) as total_customers FROM customers');
            
            // Get today's sales
            const today = new Date().toISOString().split('T')[0];
            const salesResult = await query(
                'SELECT COALESCE(SUM(total_amount), 0) as today_sales FROM sales WHERE DATE(created_at) = $1',
                [today]
            );
            
            // Get low stock count
            const lowStockResult = await query(
                'SELECT COUNT(*) as low_stock_count FROM products WHERE stock_quantity < minimum_stock'
            );
            
            // Get total stock value
            const stockValueResult = await query(
                'SELECT COALESCE(SUM(stock_quantity * cost_price), 0) as total_stock_value FROM products'
            );
            
            return {
                total_products: parseInt(productsResult.rows[0].total_products),
                total_customers: parseInt(customersResult.rows[0].total_customers),
                today_sales: parseFloat(salesResult.rows[0].today_sales),
                low_stock_count: parseInt(lowStockResult.rows[0].low_stock_count),
                total_stock_value: parseFloat(stockValueResult.rows[0].total_stock_value),
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error in getDashboardStats:', error);
            throw error;
        }
    }
    
    async getLowStockItems() {
        try {
            const result = await query(
                \`SELECT 
                    product_id,
                    name,
                    sku,
                    stock_quantity,
                    minimum_stock,
                    cost_price,
                    selling_price,
                    department
                FROM products 
                WHERE stock_quantity < minimum_stock
                ORDER BY stock_quantity ASC
                LIMIT 50\`
            );
            
            return result.rows;
        } catch (error) {
            console.error('Error in getLowStockItems:', error);
            throw error;
        }
    }
    
    async getRecentSales() {
        try {
            const result = await query(
                \`SELECT 
                    s.sale_id,
                    s.total_amount,
                    s.payment_method,
                    s.created_at,
                    c.name as customer_name,
                    c.admission_number
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                WHERE s.status = 'completed'
                ORDER BY s.created_at DESC
                LIMIT 10\`
            );
            
            return result.rows;
        } catch (error) {
            console.error('Error in getRecentSales:', error);
            throw error;
        }
    }
    
    async getCustomerBalances() {
        try {
            const result = await query(
                \`SELECT 
                    c.customer_id,
                    c.admission_number,
                    c.name,
                    c.current_class,
                    c.balance,
                    c.program_status
                FROM customers c
                WHERE c.balance > 0
                ORDER BY c.balance DESC
                LIMIT 20\`
            );
            
            return result.rows;
        } catch (error) {
            console.error('Error in getCustomerBalances:', error);
            throw error;
        }
    }
}

module.exports = DashboardService;`;
    
    fs.writeFileSync(dashboardServicePath, dashboardServiceContent);
    console.log('✅ Created dashboardService.js');
    
    // Also check if database.js has the query function
    const databaseConfigPath = path.join(projectRoot, 'backend', 'config', 'database.js');
    if (fs.existsSync(databaseConfigPath)) {
        const dbConfig = fs.readFileSync(databaseConfigPath, 'utf8');
        if (!dbConfig.includes('function query') && !dbConfig.includes('const query =')) {
            console.log('\n⚠️  Warning: database.js might not export a query function');
            console.log('Check backend/config/database.js for export pattern');
        }
    }
}

// Check for other critical missing services
const criticalServices = ['authService.js', 'customerService.js', 'inventoryService.js', 'posService.js'];
criticalServices.forEach(service => {
    if (missingServices.includes(service)) {
        console.log(`\n⚠️  ${service} is missing - this might cause issues`);
    }
});

console.log('\n📋 Next steps:');
if (missingServices.length > 0) {
    console.log(`Missing ${missingServices.length} services. You may need to create them.`);
    console.log('Or check if routes are using different service names.');
} else {
    console.log('✅ All expected services exist!');
}