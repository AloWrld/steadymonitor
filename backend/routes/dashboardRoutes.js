const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const client = await pool.connect();
        
        try {
            // Today's sales
            const salesResult = await client.query(`
                SELECT COALESCE(SUM(total_amount), 0) as today_sales
                FROM sales
                WHERE DATE(created_at) = CURRENT_DATE
            `);
            
            // Low stock count
            const lowStockResult = await client.query(`
                SELECT COUNT(*) as low_stock_count
                FROM products
                WHERE stock_quantity <= minimum_stock
            `);
            
            // Active customers
            const customersResult = await client.query(`
                SELECT COUNT(*) as total_customers
                FROM customers
                WHERE status = 'active'
            `);
            
            // Total products
            const productsResult = await client.query(`
                SELECT COUNT(*) as total_products
                FROM products
            `);
            
            res.json({
                today_sales: salesResult.rows[0].today_sales || 0,
                low_stock_count: parseInt(lowStockResult.rows[0].low_stock_count) || 0,
                total_customers: parseInt(customersResult.rows[0].total_customers) || 0,
                total_products: parseInt(productsResult.rows[0].total_products) || 0
            });
            
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// GET recent sales
router.get('/recent-sales', async (req, res) => {
    try {
        const client = await pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    s.sale_id,
                    s.total_amount,
                    s.payment_method,
                    s.department,
                    s.created_at,
                    c.name as customer_name,
                    c.admission_number
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                ORDER BY s.created_at DESC
                LIMIT 20
            `);
            
            res.json(result.rows);
            
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching recent sales:', error);
        res.status(500).json({ error: 'Failed to fetch recent sales' });
    }
});

// GET customer balances
router.get('/customers-balance', async (req, res) => {
    try {
        const client = await pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    customer_id,
                    name,
                    admission_number,
                    class,
                    pocket_money_balance,
                    uniform_balance,
                    stationery_balance
                FROM customers
                WHERE status = 'active'
                ORDER BY name
            `);
            
            res.json(result.rows);
            
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching customer balances:', error);
        res.status(500).json({ error: 'Failed to fetch customer balances' });
    }
});

module.exports = router;
