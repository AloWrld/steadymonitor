// backend/routes/pocketMoneyRoutes.js
const express = require('express');
const router = express.Router();
const pocketMoneyService = require('../services/pocketMoneyService');
const { requirePermission } = require('../middleware/authMiddleware');

/**
 * 1. PROCESS POCKET MONEY PURCHASE
 * Route: POST /api/pocket-money/purchase
 * Access: Admin + Departments
 */
router.post('/purchase', requirePermission('pocket_money'), async (req, res) => {
    try {
        const { 
            learner_id, 
            items, 
            department,
            notes = 'Pocket money purchase'
        } = req.body;

        if (!learner_id || !items || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Learner ID and items are required' 
            });
        }

        const userInfo = {
            userName: req.user?.displayName || 'System',
            userRole: req.user?.role || 'staff'
        };

        console.log(`💰 Processing pocket money purchase for learner: ${learner_id} by ${userInfo.userName}`);

        const result = await pocketMoneyService.processPocketMoneyTransaction({
            learner_id,
            items,
            department,
            notes
        }, userInfo);

        res.json({
            success: true,
            message: 'Pocket money transaction completed',
            ...result
        });

    } catch (error) {
        console.error('❌ Pocket money purchase error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to process pocket money transaction',
            error: error.message 
        });
    }
});

/**
 * 2. TOP UP POCKET MONEY
 * Route: POST /api/pocket-money/topup
 * Access: Admin only (typically)
 */
router.post('/topup', requirePermission('admin'), async (req, res) => {
    try {
        const { learner_id, amount, notes } = req.body;

        if (!learner_id || !amount || amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Learner ID and valid amount are required' 
            });
        }

        const userInfo = {
            userName: req.user?.displayName || 'System',
            userRole: req.user?.role || 'admin'
        };

        console.log(`➕ Topping up pocket money: KES ${amount} for learner ${learner_id}`);

        const result = await pocketMoneyService.topUpPocketMoney(
            learner_id, 
            parseFloat(amount), 
            notes, 
            userInfo
        );

        res.json({
            success: true,
            message: 'Pocket money topped up successfully',
            ...result
        });

    } catch (error) {
        console.error('❌ Top up pocket money error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to top up pocket money',
            error: error.message 
        });
    }
});

/**
 * 3. DEDUCT POCKET MONEY
 * Route: POST /api/pocket-money/deduct
 * Access: Admin only
 */
router.post('/deduct', requirePermission('admin'), async (req, res) => {
    try {
        const { learner_id, amount, reason } = req.body;

        if (!learner_id || !amount || amount <= 0 || !reason) {
            return res.status(400).json({ 
                success: false, 
                message: 'Learner ID, valid amount, and reason are required' 
            });
        }

        const userInfo = {
            userName: req.user?.displayName || 'System',
            userRole: req.user?.role || 'admin'
        };

        console.log(`➖ Deducting pocket money: KES ${amount} from learner ${learner_id}`);

        const result = await pocketMoneyService.deductPocketMoney(
            learner_id, 
            parseFloat(amount), 
            reason, 
            userInfo
        );

        res.json({
            success: true,
            message: 'Pocket money deducted successfully',
            ...result
        });

    } catch (error) {
        console.error('❌ Deduct pocket money error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to deduct pocket money',
            error: error.message 
        });
    }
});

/**
 * 4. GET LEARNER POCKET MONEY HISTORY
 * Route: GET /api/pocket-money/history/:learnerId
 * Access: Admin + Departments
 */
router.get('/history/:learnerId', requirePermission('pocket_money'), async (req, res) => {
    try {
        const { learnerId } = req.params;
        const { start_date, end_date, transaction_type } = req.query;

        console.log(`📋 Getting pocket money history for learner: ${learnerId}`);

        const filters = {
            start_date: start_date || null,
            end_date: end_date || null,
            transaction_type: transaction_type || null
        };

        const history = await pocketMoneyService.getLearnerPocketMoneyHistory(learnerId, filters);

        // Calculate totals by transaction type
        const totals = history.reduce((acc, transaction) => {
            const amount = parseFloat(transaction.unit_price) * (parseInt(transaction.quantity) || 1);
            
            if (transaction.sku === 'TOPUP') {
                acc.topups += amount;
            } else if (transaction.sku === 'DEDUCT') {
                acc.deductions += amount;
            } else if (transaction.product_id) {
                acc.purchases += amount;
            }
            
            acc.total_transactions += 1;
            return acc;
        }, { topups: 0, deductions: 0, purchases: 0, total_transactions: 0 });

        res.json({
            success: true,
            learner_id: learnerId,
            total_transactions: history.length,
            totals: totals,
            history: history,
            filters: filters
        });

    } catch (error) {
        console.error('❌ Get pocket money history error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch pocket money history',
            error: error.message 
        });
    }
});

/**
 * 5. GET POCKET MONEY SUMMARY
 * Route: GET /api/pocket-money/summary
 * Access: Admin + Departments
 */
router.get('/summary', requirePermission('pocket_money'), async (req, res) => {
    try {
        const { class: className, min_balance, max_balance } = req.query;

        console.log(`📊 Getting pocket money summary`);

        const filters = {
            class_name: className || null,
            min_balance: min_balance || null,
            max_balance: max_balance || null
        };

        const summary = await pocketMoneyService.getPocketMoneySummary(filters);

        // Calculate overall totals
        const totals = summary.reduce((acc, learner) => {
            acc.total_learners += 1;
            acc.total_balance += parseFloat(learner.pocket_money_balance) || 0;
            acc.total_spent += parseFloat(learner.total_spent) || 0;
            acc.total_topups += parseFloat(learner.total_topups) || 0;
            acc.total_deductions += parseFloat(learner.total_deductions) || 0;
            return acc;
        }, { 
            total_learners: 0, 
            total_balance: 0, 
            total_spent: 0, 
            total_topups: 0, 
            total_deductions: 0 
        });

        // Group by class
        const byClass = summary.reduce((acc, learner) => {
            const className = learner.class || 'Unassigned';
            if (!acc[className]) {
                acc[className] = {
                    learners: [],
                    total_balance: 0,
                    learner_count: 0
                };
            }
            acc[className].learners.push(learner);
            acc[className].total_balance += parseFloat(learner.pocket_money_balance) || 0;
            acc[className].learner_count += 1;
            return acc;
        }, {});

        res.json({
            success: true,
            total_learners: summary.length,
            totals: totals,
            summary: summary,
            grouped_by_class: byClass,
            filters: filters
        });

    } catch (error) {
        console.error('❌ Get pocket money summary error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch pocket money summary',
            error: error.message 
        });
    }
});

/**
 * 6. GET POCKET MONEY STATISTICS
 * Route: GET /api/pocket-money/stats
 * Access: Admin only
 */
router.get('/stats', requirePermission('admin'), async (req, res) => {
    try {
        console.log(`📈 Getting pocket money statistics`);

        const stats = await pocketMoneyService.getPocketMoneyStats();

        res.json({
            success: true,
            ...stats
        });

    } catch (error) {
        console.error('❌ Get pocket money stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch pocket money statistics',
            error: error.message 
        });
    }
});

/**
 * 7. ENABLE POCKET MONEY FOR LEARNER
 * Route: POST /api/pocket-money/enable/:learnerId
 * Access: Admin only
 */
router.post('/enable/:learnerId', requirePermission('admin'), async (req, res) => {
    try {
        const { learnerId } = req.params;

        const userInfo = {
            userName: req.user?.displayName || 'System',
            userRole: req.user?.role || 'admin'
        };

        console.log(`✅ Enabling pocket money for learner: ${learnerId}`);

        const result = await pocketMoneyService.enablePocketMoney(learnerId, userInfo);

        res.json({
            success: true,
            message: 'Pocket money enabled successfully',
            ...result
        });

    } catch (error) {
        console.error('❌ Enable pocket money error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to enable pocket money',
            error: error.message 
        });
    }
});

/**
 * 8. DISABLE POCKET MONEY FOR LEARNER
 * Route: POST /api/pocket-money/disable/:learnerId
 * Access: Admin only
 */
router.post('/disable/:learnerId', requirePermission('admin'), async (req, res) => {
    try {
        const { learnerId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ 
                success: false, 
                message: 'Reason is required for disabling pocket money' 
            });
        }

        const userInfo = {
            userName: req.user?.displayName || 'System',
            userRole: req.user?.role || 'admin'
        };

        console.log(`❌ Disabling pocket money for learner: ${learnerId}`);

        const result = await pocketMoneyService.disablePocketMoney(learnerId, reason, userInfo);

        res.json({
            success: true,
            message: 'Pocket money disabled successfully',
            ...result
        });

    } catch (error) {
        console.error('❌ Disable pocket money error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to disable pocket money',
            error: error.message 
        });
    }
});

/**
 * 9. VALIDATE POCKET MONEY TRANSACTION
 * Route: POST /api/pocket-money/validate
 * Access: Admin + Departments
 */
router.post('/validate', requirePermission('pocket_money'), async (req, res) => {
    try {
        const { learner_id, items, department } = req.body;

        if (!learner_id || !items || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Learner ID and items are required' 
            });
        }

        console.log(`✅ Validating pocket money transaction for learner: ${learner_id}`);

        const validation = await pocketMoneyService.validatePocketMoneyTransaction(learner_id, items, department);

        res.json({
            success: validation.valid,
            ...validation
        });

    } catch (error) {
        console.error('❌ Validate pocket money error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to validate pocket money transaction',
            error: error.message 
        });
    }
});

/**
 * 10. GET LEARNER POCKET MONEY STATUS
 * Route: GET /api/pocket-money/status/:learnerId
 * Access: Admin + Departments
 */
router.get('/status/:learnerId', requirePermission('pocket_money'), async (req, res) => {
    try {
        const { learnerId } = req.params;

        console.log(`📊 Getting pocket money status for learner: ${learnerId}`);

        // Get learner details
        const learnerResult = await db.query(
            'SELECT * FROM customers WHERE customer_id = $1',
            [learnerId]
        );

        if (learnerResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Learner not found' 
            });
        }

        const learner = learnerResult.rows[0];

        // Get recent transactions
        const recentTransactions = await pocketMoneyService.getLearnerPocketMoneyHistory(learnerId, {
            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
        });

        res.json({
            success: true,
            learner: {
                id: learnerId,
                name: learner.name,
                class: learner.class,
                boarding_status: learner.boarding_status,
                pocket_money_enabled: learner.pocket_money_enabled,
                pocket_money_balance: parseFloat(learner.pocket_money_balance) || 0,
                overall_balance: parseFloat(learner.balance) || 0
            },
            allowed_departments: ['Stationery', 'Uniform'],
            recent_transactions: recentTransactions.slice(0, 10),
            transaction_count: recentTransactions.length,
            eligibility: {
                is_boarder: learner.boarding_status === 'Boarding',
                has_pocket_money: learner.pocket_money_enabled,
                has_sufficient_balance: (parseFloat(learner.pocket_money_balance) || 0) > 0
            }
        });

    } catch (error) {
        console.error('❌ Get pocket money status error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch pocket money status',
            error: error.message 
        });
    }
});

module.exports = router;