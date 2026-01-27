// backend/routes/supplierRoutes.js
const express = require('express');
const router = express.Router();
const supplierService = require('../services/supplierService');
const { requirePermission } = require('../middleware/authMiddleware');

// ==================== SUPPLIER MANAGEMENT ====================

// GET /api/suppliers - Get all suppliers (Admin only)
router.get('/', requirePermission('suppliers'), async (req, res) => {
    try {
        const suppliers = await supplierService.getAllSuppliers();
        
        res.json({
            success: true,
            count: suppliers.length,
            suppliers: suppliers
        });
    } catch (error) {
        console.error('Get suppliers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch suppliers',
            error: error.message
        });
    }
});

// GET /api/suppliers/:id - Get single supplier (Admin only)
router.get('/:id', requirePermission('suppliers'), async (req, res) => {
    try {
        const { id } = req.params;
        const supplier = await supplierService.getSupplierById(id);
        
        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }
        
        res.json({
            success: true,
            supplier: supplier
        });
    } catch (error) {
        console.error('Get supplier error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch supplier',
            error: error.message
        });
    }
});

// POST /api/suppliers - Create supplier (Admin only)
router.post('/', requirePermission('suppliers'), async (req, res) => {
    try {
        const supplierData = req.body;
        const userInfo = {
            userName: req.user?.displayName || 'System'
        };

        const supplier = await supplierService.createSupplier(supplierData);
        
        // Check if supplier already existed
        const isNew = !req.body.supplier_id || req.body.supplier_id !== supplier.supplier_id;
        
        res.status(isNew ? 201 : 200).json({
            success: true,
            message: isNew ? 'Supplier created successfully' : 'Supplier already exists',
            supplier: supplier
        });
    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create supplier',
            error: error.message
        });
    }
});

// PUT /api/suppliers/:id - Update supplier (Admin only)
router.put('/:id', requirePermission('suppliers'), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const supplier = await supplierService.updateSupplier(id, updateData);
        
        res.json({
            success: true,
            message: 'Supplier updated successfully',
            supplier: supplier
        });
    } catch (error) {
        console.error('Update supplier error:', error);
        if (error.message === 'Supplier not found') {
            res.status(404).json({
                success: false,
                message: error.message
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to update supplier',
                error: error.message
            });
        }
    }
});

// DELETE /api/suppliers/:id - Archive supplier (Admin only)
router.delete('/:id', requirePermission('suppliers'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const supplier = await supplierService.deleteSupplier(id);
        
        res.json({
            success: true,
            message: 'Supplier archived successfully',
            supplier: supplier
        });
    } catch (error) {
        console.error('Delete supplier error:', error);
        if (error.message === 'Supplier not found or already deleted') {
            res.status(404).json({
                success: false,
                message: error.message
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to archive supplier',
                error: error.message
            });
        }
    }
});

// GET /api/suppliers/search?q=... - Search suppliers (Admin only)
router.get('/search', requirePermission('suppliers'), async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        const suppliers = await supplierService.searchSuppliers(q);
        
        res.json({
            success: true,
            count: suppliers.length,
            suppliers: suppliers
        });
    } catch (error) {
        console.error('Search suppliers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search suppliers',
            error: error.message
        });
    }
});

// ==================== RESTOCK MANAGEMENT ====================

// POST /api/suppliers/restock - Process restock (Admin only) - ORIGINAL EXCEL ENDPOINT
router.post('/restock', requirePermission('suppliers'), async (req, res) => {
    try {
        const { supplier_id, items, misc_expenses = 0 } = req.body;
        
        if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: supplier_id and items array are required'
            });
        }

        const userInfo = {
            userName: req.user?.displayName || 'admin'
        };

        const result = await supplierService.processRestock(
            { supplier_id, misc_expenses },
            items,
            userInfo
        );

        res.status(201).json({
            success: true,
            message: 'Restock completed successfully',
            ...result
        });
    } catch (error) {
        console.error('Restock error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process restock',
            error: error.message
        });
    }
});

// GET /api/suppliers/restocks - Get all restocks (Admin only)
router.get('/restocks/all', requirePermission('suppliers'), async (req, res) => {
    try {
        const { supplier_id, status, start_date, end_date } = req.query;
        
        const filters = {};
        if (supplier_id) filters.supplier_id = supplier_id;
        if (status) filters.status = status;
        if (start_date) filters.start_date = start_date;
        if (end_date) filters.end_date = end_date;
        
        const restocks = await supplierService.getRestocks(filters);
        
        res.json({
            success: true,
            count: restocks.length,
            restocks: restocks
        });
    } catch (error) {
        console.error('Get restocks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch restocks',
            error: error.message
        });
    }
});

// ==================== CREDIT & PAYMENT MANAGEMENT ====================

// POST /api/suppliers/payments - Record supplier payment (Admin only) - ORIGINAL EXCEL ENDPOINT
router.post('/payments', requirePermission('suppliers'), async (req, res) => {
    try {
        const paymentData = req.body;
        const userInfo = {
            userName: req.user?.displayName || 'admin'
        };

        const result = await supplierService.recordSupplierPayment(paymentData, userInfo);

        res.status(201).json({
            success: true,
            message: 'Payment recorded successfully',
            ...result
        });
    } catch (error) {
        console.error('Supplier payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record payment',
            error: error.message
        });
    }
});

// GET /api/suppliers/:id/credits - Get supplier credit status (Admin only) - ORIGINAL EXCEL ENDPOINT
router.get('/:id/credits', requirePermission('suppliers'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await supplierService.getSupplierBalance(id);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Supplier credits error:', error);
        if (error.message === 'Supplier not found') {
            res.status(404).json({
                success: false,
                message: error.message
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch supplier credit information',
                error: error.message
            });
        }
    }
});

// GET /api/suppliers/:id/transactions - Get supplier transactions (Admin only) - ORIGINAL EXCEL ENDPOINT
router.get('/:id/transactions', requirePermission('suppliers'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const transactions = await supplierService.getSupplierTransactions(id);
        
        res.json({
            success: true,
            supplier_id: id,
            ...transactions
        });
    } catch (error) {
        console.error('Supplier transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch supplier transactions',
            error: error.message
        });
    }
});

// ==================== REPORTS ====================

// GET /api/suppliers/reports/due-credits - Get overdue credits report (Admin only)
router.get('/reports/due-credits', requirePermission('suppliers'), async (req, res) => {
    try {
        const dueCredits = await supplierService.getDueCreditsReport();
        
        res.json({
            success: true,
            count: dueCredits.length,
            total_overdue: dueCredits.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
            due_credits: dueCredits
        });
    } catch (error) {
        console.error('Due credits report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate due credits report',
            error: error.message
        });
    }
});

// GET /api/suppliers/reports/low-stock - Get low stock alerts (Admin only)
router.get('/reports/low-stock', requirePermission('suppliers'), async (req, res) => {
    try {
        const lowStockItems = await supplierService.getLowStockSuppliers();
        
        res.json({
            success: true,
            count: lowStockItems.length,
            low_stock_items: lowStockItems
        });
    } catch (error) {
        console.error('Low stock report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate low stock report',
            error: error.message
        });
    }
});

// GET /api/suppliers/reports/performance - Get supplier performance (Admin only)
router.get('/reports/performance', requirePermission('suppliers'), async (req, res) => {
    try {
        const performance = await supplierService.getSupplierPerformance();
        
        res.json({
            success: true,
            count: performance.length,
            performance: performance
        });
    } catch (error) {
        console.error('Supplier performance report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate supplier performance report',
            error: error.message
        });
    }
});

module.exports = router;