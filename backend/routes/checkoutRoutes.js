// backend/routes/checkoutRoutes.js (NEW VERSION)
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/authMiddleware');

// Just redirect to appropriate module
router.post('/complete', requirePermission('checkout'), async (req, res) => {
    const { transaction_type } = req.body;
    
    // Redirect based on transaction type
    switch (transaction_type) {
        case 'regular_sale':
            return res.redirect(307, '/api/pos/checkout');
        case 'program_allocation':
            return res.redirect(307, '/api/allocations');
        case 'parent_payment':
            return res.redirect(307, '/api/payments');
        case 'pocket_money':
            return res.redirect(307, '/api/pocket-money/purchase');
        case 'refund':
        case 'exchange':
            return res.redirect(307, '/api/refunds');
        default:
            return res.status(400).json({
                success: false,
                message: 'Invalid transaction type'
            });
    }
});

// Keep these utility endpoints
router.get('/receipt/:sale_id', requirePermission('checkout'), (req, res) => {
    // Delegate to appropriate service
    res.redirect(`/api/sales/receipt/${req.params.sale_id}`);
});

router.post('/lookup-receipt', requirePermission('checkout'), (req, res) => {
    res.redirect(307, '/api/sales/lookup');
});

// M-Pesa and Bank endpoints can stay here or move to payment module
router.post('/mpesa-stk', requirePermission('checkout'), async (req, res) => {
    // Keep M-Pesa simulation here
    // Or redirect to /api/payments/mpesa
});

module.exports = router;