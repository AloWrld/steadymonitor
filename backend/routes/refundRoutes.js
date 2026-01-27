// backend/routes/refundRoutes.js
const express = require('express');
const router = express.Router();
const refundService = require('../services/refundService');
const { requirePermission } = require('../middleware/authMiddleware');

/**
 * 1. PROCESS REFUND
 * Route: POST /api/refunds
 * Access: Admin + Departments (with department restriction)
 */
router.post('/', requirePermission('refunds'), async (req, res) => {
    try {
        const {
            original_sale_id,
            customer_id,
            items,
            refund_type = 'full',
            exchange_items = [],
            reason,
            notes = ''
        } = req.body;

        if (!original_sale_id || !items || items.length === 0 || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Original sale ID, items, and reason are required'
            });
        }

        const userInfo = {
            userName: req.user?.displayName || 'System',
            userRole: req.user?.role || 'staff',
            userDepartment: req.user?.department || 'Unknown'
        };

        console.log(`🔄 Processing refund for sale: ${original_sale_id} by ${userInfo.userName}`);

        const result = await refundService.processRefund({
            original_sale_id,
            customer_id,
            items,
            refund_type,
            exchange_items,
            reason,
            notes
        }, userInfo);

        res.json({
            success: true,
            message: `${refund_type === 'exchange' ? 'Exchange' : 'Refund'} processed successfully`,
            ...result
        });

    } catch (error) {
        console.error('❌ Process refund error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process refund',
            error: error.message
        });
    }
});

/**
 * 2. GET REFUNDS BY SALE
 * Route: GET /api/refunds/sale/:saleId
 * Access: Admin + Departments
 */
router.get('/sale/:saleId', requirePermission('refunds'), async (req, res) => {
    try {
        const { saleId } = req.params;

        console.log(`📋 Getting refunds for sale: ${saleId}`);

        const refunds = await refundService.getRefundsBySale(saleId);

        res.json({
            success: true,
            sale_id: saleId,
            refund_count: refunds.length,
            total_refunded: refunds.reduce((sum, r) => sum + (parseFloat(r.amount_returned) || 0), 0),
            refunds: refunds
        });

    } catch (error) {
        console.error('❌ Get refunds error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch refunds',
            error: error.message
        });
    }
});

/**
 * 3. GENERATE RECEIPT
 * Route: POST /api/refunds/receipt
 * Access: Admin + Departments
 */
router.post('/receipt', requirePermission('refunds'), async (req, res) => {
    try {
        const { transaction_id, receipt_type = 'sale' } = req.body;

        if (!transaction_id) {
            return res.status(400).json({
                success: false,
                message: 'Transaction ID is required'
            });
        }

        console.log(`🧾 Generating ${receipt_type} receipt for: ${transaction_id}`);

        const receipt = await refundService.generateReceipt(transaction_id, receipt_type);

        res.json({
            success: true,
            receipt: receipt,
            printable: true
        });

    } catch (error) {
        console.error('❌ Generate receipt error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate receipt',
            error: error.message
        });
    }
});

/**
 * 4. GET REFUND SUMMARY
 * Route: GET /api/refunds/summary
 * Access: Admin + Departments
 */
router.get('/summary', requirePermission('refunds'), async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        console.log(`📊 Getting refund summary for period: ${period}`);

        const summary = await refundService.getRefundSummary(period);

        // Calculate totals
        const totals = summary.reduce((acc, day) => {
            acc.total_refunds += day.refund_count || 0;
            acc.total_amount += parseFloat(day.total_refunded) || 0;
            return acc;
        }, { total_refunds: 0, total_amount: 0 });

        res.json({
            success: true,
            period: period,
            totals: totals,
            daily_summary: summary,
            statistics: {
                average_daily_refund: totals.total_amount / (summary.length || 1),
                refund_rate: (totals.total_refunds / (summary.length * 10 || 1)) * 100 // Assuming 10 sales/day
            }
        });

    } catch (error) {
        console.error('❌ Get refund summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch refund summary',
            error: error.message
        });
    }
});

/**
 * 5. LOOKUP RECEIPT (Compatibility with old checkout endpoint)
 * Route: POST /api/refunds/lookup-receipt
 * Access: Admin + Departments
 */
router.post('/lookup-receipt', requirePermission('refunds'), async (req, res) => {
    try {
        const { sale_id, sale_date } = req.body;

        if (!sale_id) {
            return res.status(400).json({
                success: false,
                message: 'Sale ID is required'
            });
        }

        console.log(`🔍 Looking up receipt for sale: ${sale_id}`);

        // Get sale details
        const saleResult = await db.query(`
            SELECT s.*, c.name as customer_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.customer_id
            WHERE s.sale_id = $1
        `, [sale_id]);

        if (saleResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Sale ${sale_id} not found`
            });
        }

        const sale = saleResult.rows[0];

        // Validate date if provided
        if (sale_date) {
            const saleDate = new Date(sale.date).toDateString();
            const inputDate = new Date(sale_date).toDateString();
            
            if (saleDate !== inputDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Sale date does not match receipt'
                });
            }
        }

        // Get sale items
        const itemsResult = await db.query(
            'SELECT * FROM sale_items WHERE sale_id = $1',
            [sale_id]
        );

        // Check for existing refunds
        const refundsResult = await db.query(
            'SELECT COUNT(*) as refund_count FROM refunds WHERE original_sale_id = $1',
            [sale_id]
        );

        const hasRefunds = parseInt(refundsResult.rows[0]?.refund_count || 0) > 0;

        res.json({
            success: true,
            sale: sale,
            items: itemsResult.rows,
            can_process_refund: !hasRefunds && sale.status === 'completed',
            has_existing_refunds: hasRefunds,
            department: sale.department
        });

    } catch (error) {
        console.error('❌ Lookup receipt error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to lookup receipt',
            error: error.message
        });
    }
});

// Add db import at top if not already there
const db = require('../config/database');

module.exports = router;