// backend/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const { requirePermission } = require('../middleware/authMiddleware');

// ==================== SALES REPORTS ====================

// GET /api/reports/sales - Sales report (Admin only)
router.get('/sales', requirePermission('admin'), async (req, res) => {
    try {
        const filters = {
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            department: req.query.department,
            payment_mode: req.query.payment_mode,
            program_type: req.query.program_type
        };
        
        const report = await reportService.getSalesReport(filters);
        
        res.json(report);
    } catch (error) {
        console.error('Sales report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate sales report',
            error: error.message
        });
    }
});

// GET /api/reports/profit - Profit report (Admin only)
router.get('/profit', requirePermission('admin'), async (req, res) => {
    try {
        const filters = {
            start_date: req.query.start_date,
            end_date: req.query.end_date
        };
        
        const report = await reportService.getProfitReport(filters);
        
        res.json(report);
    } catch (error) {
        console.error('Profit report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate profit report',
            error: error.message
        });
    }
});

// ==================== INVENTORY REPORTS ====================

// GET /api/reports/inventory - Inventory report (Admin only)
router.get('/inventory', requirePermission('admin'), async (req, res) => {
    try {
        const report = await reportService.getInventoryReport();
        
        res.json(report);
    } catch (error) {
        console.error('Inventory report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate inventory report',
            error: error.message
        });
    }
});

// ==================== CUSTOMER REPORTS ====================

// GET /api/reports/customers - Customer report (Admin only)
router.get('/customers', requirePermission('admin'), async (req, res) => {
    try {
        const filters = {
            program: req.query.program,
            boarding_status: req.query.boarding_status,
            installment_status: req.query.installment_status,
            has_balance: req.query.has_balance
        };
        
        const report = await reportService.getCustomerReport(filters);
        
        res.json(report);
    } catch (error) {
        console.error('Customer report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate customer report',
            error: error.message
        });
    }
});

// GET /api/reports/allocations - Allocation report (Admin only)
router.get('/allocations', requirePermission('admin'), async (req, res) => {
    try {
        const filters = {
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            status: req.query.status,
            program_type: req.query.program_type
        };
        
        const report = await reportService.getAllocationReport(filters);
        
        res.json(report);
    } catch (error) {
        console.error('Allocation report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate allocation report',
            error: error.message
        });
    }
});

// GET /api/reports/pocket-money - Pocket money report (Admin only)
router.get('/pocket-money', requirePermission('admin'), async (req, res) => {
    try {
        const filters = {
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            customer_id: req.query.customer_id
        };
        
        const report = await reportService.getPocketMoneyReport(filters);
        
        res.json(report);
    } catch (error) {
        console.error('Pocket money report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate pocket money report',
            error: error.message
        });
    }
});

// GET /api/reports/installments - Installment report (Admin only)
router.get('/installments', requirePermission('admin'), async (req, res) => {
    try {
        const filters = {
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            customer_id: req.query.customer_id,
            parent_phone: req.query.parent_phone
        };
        
        const report = await reportService.getInstallmentReport(filters);
        
        res.json(report);
    } catch (error) {
        console.error('Installment report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate installment report',
            error: error.message
        });
    }
});

// ==================== SUPPLIER REPORTS ====================

// GET /api/reports/suppliers - Supplier report (Admin only)
router.get('/suppliers', requirePermission('admin'), async (req, res) => {
    try {
        const report = await reportService.getSupplierReport();
        
        res.json(report);
    } catch (error) {
        console.error('Supplier report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate supplier report',
            error: error.message
        });
    }
});

// ==================== EXPORT ENDPOINTS ====================

// GET /api/reports/export/excel - Export to Excel (Admin only)
router.get('/export/excel', requirePermission('admin'), async (req, res) => {
    try {
        const exportType = req.query.type || 'all';
        const filters = {
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            department: req.query.department
        };
        
        const buffer = await reportService.exportToExcel(exportType, filters);
        
        // Set response headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=steadymonitor-report-${Date.now()}.xlsx`);
        
        res.send(buffer);
    } catch (error) {
        console.error('Excel export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export to Excel',
            error: error.message
        });
    }
});

// GET /api/reports/export/pdf - Export to PDF (Admin only)
router.get('/export/pdf', requirePermission('admin'), async (req, res) => {
    try {
        const reportType = req.query.type || 'sales_summary';
        const filters = {
            start_date: req.query.start_date,
            end_date: req.query.end_date
        };
        
        const buffer = await reportService.generatePDF(reportType, filters);
        
        // Set response headers for file download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=steadymonitor-${reportType}-${Date.now()}.pdf`);
        
        res.send(buffer);
    } catch (error) {
        console.error('PDF export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate PDF',
            error: error.message
        });
    }
});

// ==================== DATA MANAGEMENT ====================

// GET /api/reports/data-status - Check data retention status (Admin only)
router.get('/data-status', requirePermission('admin'), async (req, res) => {
    try {
        const notification = await reportService.getDataRetentionNotification();
        
        res.json({
            success: true,
            ...notification,
            recommendation: notification.has_old_data ? 
                'Consider archiving old data to maintain system performance.' :
                'Data is within acceptable retention period.'
        });
    } catch (error) {
        console.error('Data status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check data status',
            error: error.message
        });
    }
});

// GET /api/reports/overview - System overview (Admin only)
router.get('/overview', requirePermission('admin'), async (req, res) => {
    try {
        // Get basic counts for dashboard
        const [
            customersCount,
            productsCount,
            suppliersCount,
            salesCount,
            lowStockCount
        ] = await Promise.all([
            db.query('SELECT COUNT(*) as count FROM customers'),
            db.query('SELECT COUNT(*) as count FROM products WHERE active = true'),
            db.query('SELECT COUNT(*) as count FROM suppliers WHERE active = true'),
            db.query('SELECT COUNT(*) as count FROM sales WHERE created_at >= CURRENT_DATE - INTERVAL \'30 days\''),
            db.query('SELECT COUNT(*) as count FROM products WHERE stock_qty <= reorder_level AND active = true')
        ]);
        
        // Get today's sales
        const todaySales = await db.query(`
            SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count 
            FROM sales 
            WHERE DATE(created_at) = CURRENT_DATE
        `);
        
        // Get monthly sales
        const monthlySales = await db.query(`
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                COUNT(*) as transactions,
                SUM(total) as total_amount
            FROM sales
            WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
        `);
        
        res.json({
            success: true,
            generated_at: new Date().toISOString(),
            counts: {
                customers: parseInt(customersCount.rows[0].count),
                products: parseInt(productsCount.rows[0].count),
                suppliers: parseInt(suppliersCount.rows[0].count),
                recent_sales: parseInt(salesCount.rows[0].count),
                low_stock_items: parseInt(lowStockCount.rows[0].count)
            },
            today: {
                sales_count: parseInt(todaySales.rows[0].count),
                sales_total: parseFloat(todaySales.rows[0].total) || 0
            },
            monthly_trend: monthlySales.rows.map(row => ({
                month: row.month.toISOString().split('T')[0].substring(0, 7),
                transactions: parseInt(row.transactions),
                total_amount: parseFloat(row.total_amount) || 0
            }))
        });
    } catch (error) {
        console.error('Overview report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate overview report',
            error: error.message
        });
    }
});

module.exports = router;