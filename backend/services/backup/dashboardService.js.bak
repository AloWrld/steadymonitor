const { query } = require('../config/database');

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
                `SELECT 
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
                LIMIT 50`
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
                `SELECT 
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
                LIMIT 10`
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
                `SELECT 
                    c.customer_id,
                    c.admission_number,
                    c.name,
                    c.current_class,
                    c.balance,
                    c.program_status
                FROM customers c
                WHERE c.balance > 0
                ORDER BY c.balance DESC
                LIMIT 20`
            );
            
            return result.rows;
        } catch (error) {
            console.error('Error in getCustomerBalances:', error);
            throw error;
        }
    }
}

module.exports = new DashboardService();