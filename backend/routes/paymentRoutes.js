// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { requirePermission } = require('../middleware/authMiddleware');

/**
 * 1. RECORD PAYMENT (Individual)
 * Route: POST /api/payments
 * Access: Admin + Departments
 */
router.post('/', requirePermission('payments'), async (req, res) => {
    try {
        const { 
            learner_id, 
            amount, 
            payment_method, 
            reference, 
            notes,
            sale_id,
            is_installment
        } = req.body;

        if (!learner_id || !amount || amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Learner ID and valid amount are required' 
            });
        }

        const userInfo = {
            userName: req.user?.displayName || 'System',
            userRole: req.user?.role || 'staff'
        };

        console.log(`💰 Recording payment: KES ${amount} for learner ${learner_id} by ${userInfo.userName}`);

        // Validate payment first
        const validation = await paymentService.validatePayment(learner_id, amount, payment_method || 'cash');
        if (!validation.valid) {
            return res.status(400).json({ 
                success: false, 
                message: validation.message 
            });
        }

        const result = await paymentService.recordPayment({
            learner_id,
            amount: parseFloat(amount),
            payment_method: payment_method || 'cash',
            reference: reference || `PAY-${Date.now()}`,
            notes: notes || '',
            sale_id: sale_id || null,
            is_installment: is_installment || false
        }, userInfo);

        res.json({
            success: true,
            message: 'Payment recorded successfully',
            ...result
        });

    } catch (error) {
        console.error('❌ Record payment error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to record payment',
            error: error.message 
        });
    }
});

/**
 * 2. RECORD BULK PAYMENTS
 * Route: POST /api/payments/bulk
 * Access: Admin + Departments
 */
router.post('/bulk', requirePermission('payments'), async (req, res) => {
    try {
        const { payments } = req.body;

        if (!payments || !Array.isArray(payments) || payments.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Payments array is required' 
            });
        }

        const userInfo = {
            userName: req.user?.displayName || 'System',
            userRole: req.user?.role || 'staff'
        };

        console.log(`💰 Recording ${payments.length} bulk payments by ${userInfo.userName}`);

        const result = await paymentService.recordBulkPayments(payments, userInfo);

        res.json({
            success: true,
            message: `Bulk payments recorded: ${result.successful} successful, ${result.failed} failed`,
            ...result
        });

    } catch (error) {
        console.error('❌ Bulk payment error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to record bulk payments',
            error: error.message 
        });
    }
});

/**
 * 3. GET LEARNER PAYMENTS
 * Route: GET /api/payments/learner/:learnerId
 * Access: Admin + Departments
 */
router.get('/learner/:learnerId', requirePermission('payments'), async (req, res) => {
    try {
        const { learnerId } = req.params;
        const { start_date, end_date, method } = req.query;

        console.log(`📋 Getting payments for learner: ${learnerId}`);

        const filters = {
            start_date: start_date || null,
            end_date: end_date || null,
            payment_method: method || null
        };

        const payments = await paymentService.getLearnerPayments(learnerId, filters);

        // Calculate totals
        const totals = payments.reduce((acc, payment) => {
            acc.total_paid += parseFloat(payment.amount) || 0;
            acc.payment_count += 1;
            return acc;
        }, { total_paid: 0, payment_count: 0 });

        // Get installment payments separately
        const installmentPayments = await paymentService.getInstallmentPayments(learnerId);
        const installmentTotal = installmentPayments.reduce((sum, ip) => sum + (parseFloat(ip.amount) || 0), 0);

        res.json({
            success: true,
            learner_id: learnerId,
            total_payments: payments.length,
            totals: {
                ...totals,
                installment_total: installmentTotal,
                all_payments_total: totals.total_paid + installmentTotal
            },
            payments: payments,
            installment_payments: installmentPayments,
            filters: filters
        });

    } catch (error) {
        console.error('❌ Get learner payments error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch learner payments',
            error: error.message 
        });
    }
});

/**
 * 4. GET PAYMENT SUMMARY
 * Route: GET /api/payments/summary
 * Access: Admin + Departments
 */
router.get('/summary', requirePermission('payments'), async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        console.log(`📈 Getting payment summary for period: ${period}`);

        const summary = await paymentService.getPaymentSummary(period);
        const methodsSummary = await paymentService.getPaymentMethodsSummary();

        // Calculate overall totals
        const periodTotal = summary.reduce((sum, row) => sum + (parseFloat(row.total_amount) || 0), 0);
        const overallTotal = methodsSummary.reduce((sum, row) => sum + (parseFloat(row.total_amount) || 0), 0);

        res.json({
            success: true,
            period: period,
            period_total: periodTotal,
            overall_total: overallTotal,
            daily_summary: summary,
            methods_summary: methodsSummary,
            stats: {
                total_days: summary.length,
                total_methods: methodsSummary.length,
                average_daily: periodTotal / (summary.length || 1)
            }
        });

    } catch (error) {
        console.error('❌ Get payment summary error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch payment summary',
            error: error.message 
        });
    }
});

/**
 * 5. GET OUTSTANDING BALANCES
 * Route: GET /api/payments/outstanding
 * Access: Admin + Departments
 */
router.get('/outstanding', requirePermission('payments'), async (req, res) => {
    try {
        const { class: className, program, min_balance, max_balance } = req.query;

        console.log(`📊 Getting outstanding balances`);

        const filters = {
            class_name: className || null,
            program: program || null,
            min_balance: min_balance || null,
            max_balance: max_balance || null
        };

        const outstanding = await paymentService.getOutstandingBalances(filters);

        // Calculate totals
        const totals = outstanding.reduce((acc, learner) => {
            acc.total_balance += parseFloat(learner.balance) || 0;
            acc.total_learners += 1;
            acc.total_items_cost += parseFloat(learner.total_items_cost) || 0;
            acc.total_paid += parseFloat(learner.total_paid) || 0;
            return acc;
        }, { total_balance: 0, total_learners: 0, total_items_cost: 0, total_paid: 0 });

        // Group by class
        const byClass = outstanding.reduce((acc, learner) => {
            const className = learner.class || 'Unassigned';
            if (!acc[className]) {
                acc[className] = {
                    learners: [],
                    total_balance: 0,
                    learner_count: 0
                };
            }
            acc[className].learners.push(learner);
            acc[className].total_balance += parseFloat(learner.balance) || 0;
            acc[className].learner_count += 1;
            return acc;
        }, {});

        res.json({
            success: true,
            total_learners: outstanding.length,
            totals: totals,
            outstanding: outstanding,
            grouped_by_class: byClass,
            filters: filters
        });

    } catch (error) {
        console.error('❌ Get outstanding balances error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch outstanding balances',
            error: error.message 
        });
    }
});

/**
 * 6. VALIDATE PAYMENT
 * Route: POST /api/payments/validate
 * Access: Admin + Departments
 */
router.post('/validate', requirePermission('payments'), async (req, res) => {
    try {
        const { learner_id, amount, payment_method } = req.body;

        if (!learner_id || !amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Learner ID and amount are required' 
            });
        }

        console.log(`✅ Validating payment for learner: ${learner_id}, amount: ${amount}`);

        const validation = await paymentService.validatePayment(
            learner_id, 
            parseFloat(amount), 
            payment_method || 'cash'
        );

        res.json({
            success: true,
            ...validation
        });

    } catch (error) {
        console.error('❌ Validate payment error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to validate payment',
            error: error.message 
        });
    }
});

/**
 * 7. GET PAYMENT BY ID
 * Route: GET /api/payments/:paymentId
 * Access: Admin + Departments
 */
router.get('/:paymentId', requirePermission('payments'), async (req, res) => {
    try {
        const { paymentId } = req.params;

        console.log(`🔍 Getting payment details: ${paymentId}`);

        const payment = await paymentService.getPaymentById(paymentId);

        if (!payment) {
            return res.status(404).json({ 
                success: false, 
                message: 'Payment not found' 
            });
        }

        res.json({
            success: true,
            payment: payment
        });

    } catch (error) {
        console.error('❌ Get payment error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch payment',
            error: error.message 
        });
    }
});

/**
 * 8. GET INSTALLMENT PAYMENTS
 * Route: GET /api/payments/installments/:learnerId
 * Access: Admin + Departments
 */
router.get('/installments/:learnerId', requirePermission('payments'), async (req, res) => {
    try {
        const { learnerId } = req.params;

        console.log(`💳 Getting installment payments for learner: ${learnerId}`);

        const installmentPayments = await paymentService.getInstallmentPayments(learnerId);

        const totals = installmentPayments.reduce((acc, payment) => {
            acc.total_paid += parseFloat(payment.amount) || 0;
            acc.payment_count += 1;
            return acc;
        }, { total_paid: 0, payment_count: 0 });

        res.json({
            success: true,
            learner_id: learnerId,
            total_installments: installmentPayments.length,
            totals: totals,
            installment_payments: installmentPayments
        });

    } catch (error) {
        console.error('❌ Get installment payments error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch installment payments',
            error: error.message 
        });
    }
});

/**
 * 9. GET PAYMENT STATISTICS
 * Route: GET /api/payments/stats
 * Access: Admin only
 */
router.get('/stats', requirePermission('admin'), async (req, res) => {
    try {
        console.log(`📊 Getting payment statistics`);

        // Get daily trends for last 30 days
        const dailyTrends = await db.query(`
            SELECT 
                DATE(date) as payment_date,
                COUNT(*) as payment_count,
                SUM(amount) as total_amount,
                AVG(amount) as average_payment
            FROM payments
            WHERE status = 'completed'
              AND date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(date)
            ORDER BY payment_date DESC
        `);

        // Get class-wise outstanding
        const classOutstanding = await db.query(`
            SELECT 
                class,
                COUNT(*) as learner_count,
                SUM(balance) as total_balance,
                AVG(balance) as average_balance
            FROM customers
            WHERE balance > 0
              AND class IS NOT NULL
            GROUP BY class
            ORDER BY total_balance DESC
        `);

        // Get payment method trends
        const methodTrends = await db.query(`
            SELECT 
                method,
                DATE_TRUNC('month', date) as month,
                COUNT(*) as payment_count,
                SUM(amount) as total_amount
            FROM payments
            WHERE status = 'completed'
            GROUP BY method, DATE_TRUNC('month', date)
            ORDER BY month DESC, total_amount DESC
        `);

        // Get top payers
        const topPayers = await db.query(`
            SELECT 
                c.customer_id,
                c.name,
                c.class,
                COUNT(p.payment_id) as payment_count,
                SUM(p.amount) as total_paid,
                c.balance
            FROM customers c
            LEFT JOIN payments p ON c.customer_id = p.customer_id
            WHERE p.status = 'completed'
            GROUP BY c.customer_id, c.name, c.class, c.balance
            ORDER BY total_paid DESC
            LIMIT 20
        `);

        res.json({
            success: true,
            daily_trends: dailyTrends.rows,
            class_outstanding: classOutstanding.rows,
            method_trends: methodTrends.rows,
            top_payers: topPayers.rows,
            summary: {
                total_payments_last_30_days: dailyTrends.rows.reduce((sum, row) => sum + (row.payment_count || 0), 0),
                total_amount_last_30_days: dailyTrends.rows.reduce((sum, row) => sum + (parseFloat(row.total_amount) || 0), 0),
                total_outstanding: classOutstanding.rows.reduce((sum, row) => sum + (parseFloat(row.total_balance) || 0), 0),
                learners_with_balance: classOutstanding.rows.reduce((sum, row) => sum + (row.learner_count || 0), 0)
            }
        });

    } catch (error) {
        console.error('❌ Get payment statistics error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch payment statistics',
            error: error.message 
        });
    }
});

module.exports = router;