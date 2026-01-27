// backend/routes/posRoutes.js
const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const router = express.Router();
const posService = require('../services/posService');
const { requirePermission } = require('../middleware/authMiddleware');

/**
 * HELPER: Get user's department from role
 */
function getUserDepartment(role) {
    if (role === 'admin') return 'admin';
    return role; // In Format C, role IS the department name
}

/**
 * HELPER: Check if user has POS access
 */
function hasPOSAccess(userRole) {
    return ['admin', 'department_uniform', 'department_stationery'].includes(userRole);
}

/**
 * 1. GET PRODUCTS BY DEPARTMENT - UPDATED FOR CROSS-DEPARTMENT ACCESS
 * Route: GET /api/pos/products/:department
 * Access: Any logged-in user with POS access can access any department
 */
router.get('/products/:department', requireAuth, async (req, res) => { // Removed requirePermission middleware
    try {
        const { department } = req.params;
        const userRole = req.user?.role || 'Unknown';
        
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        // Check if user has POS access
        if (!hasPOSAccess(userRole)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. POS access required.' 
            });
        }

        // Allow any logged-in user to access both departments
        const allowedDepartments = ['Uniform', 'Stationery'];
        if (!allowedDepartments.includes(department)) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid department. Must be one of: ${allowedDepartments.join(', ')}` 
            });
        }

        console.log(`📦 Fetching ${department} products for user: ${req.user?.display_name || 'Unknown'}`);
        
        // Pass user's department for filtering if needed, but allow cross-access
        const userDept = getUserDepartment(userRole);
        
        const products = await posService.getProductsByDepartment(department, req.user?.user_id, userDept);

        res.json({ 
            success: true, 
            count: products.length, 
            products: products,
            department: department,
            user_department: userDept,
            has_cross_access: true
        });
    } catch (error) {
        console.error('❌ Error fetching products:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch products',
            error: error.message 
        });
    }
});

/**
 * 2. SEARCH PRODUCTS BY SKU OR NAME - UPDATED FOR CROSS-DEPARTMENT ACCESS
 * Route: GET /api/pos/search?q=search_term
 * Access: Any logged-in user with POS access
 */
router.get('/search', requireAuth, async (req, res) => { // Removed requirePermission middleware
    try {
        const { q } = req.query;
        const userRole = req.user?.role || 'Unknown';

        // Check authentication
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        // Check POS access
        if (!hasPOSAccess(userRole)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. POS access required.' 
            });
        }

        if (!q || q.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                message: 'Search query is required' 
            });
        }

        console.log(`🔍 Searching products for: ${q} by user: ${req.user?.display_name || 'Unknown'}`);
        
        // Allow searching across both departments for users with POS access
        const userDept = getUserDepartment(userRole);
        const results = await posService.searchProducts(q, userDept);

        res.json({ 
            success: true, 
            count: results.length,
            products: results,
            user_department: userDept,
            has_cross_access: true
        });
    } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Search failed',
            error: error.message 
        });
    }
});

/**
 * 3. GET PRODUCT BY SKU - UPDATED FOR CROSS-DEPARTMENT ACCESS
 * Route: GET /api/pos/product/sku/:sku
 * Access: Any logged-in user with POS access
 */
router.get('/product/sku/:sku', requireAuth, async (req, res) => { // Removed requirePermission middleware
    try {
        const { sku } = req.params;
        const userRole = req.user?.role || 'Unknown';

        // Check authentication
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        // Check POS access
        if (!hasPOSAccess(userRole)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. POS access required.' 
            });
        }

        if (!sku) {
            return res.status(400).json({ 
                success: false, 
                message: 'SKU is required' 
            });
        }

        console.log(`🔎 Looking up product by SKU: ${sku} for user: ${req.user?.display_name || 'Unknown'}`);
        
        const product = await posService.findProductBySku(sku);
        
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: `Product with SKU ${sku} not found` 
            });
        }

        // REMOVED department restriction - allow access to any department's product
        // if (userDept !== 'admin' && product.department !== userDept) {
        //     return res.status(403).json({ 
        //         success: false, 
        //         message: `Access denied. This product belongs to ${product.department} department.` 
        //     });
        // }

        res.json({ 
            success: true, 
            product: product,
            has_cross_access: true
        });
    } catch (error) {
        console.error('❌ Error finding product by SKU:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to find product',
            error: error.message 
        });
    }
});

/**
 * 4. M-PESA STK PUSH (Triggered from Checkout)
 * Route: POST /api/pos/mpesa-push
 * Access: Admin + Departments
 */
router.post('/mpesa-push', requirePermission('pos'), async (req, res) => {
    try {
        const { amount, phone, sale_id } = req.body;
        
        console.log(`💰 Initiating STK Push: KES ${amount} to ${phone} for sale ${sale_id} by user: ${req.user?.display_name || 'Unknown'}`);
        
        const result = await posService.simulateMpesaPayment(amount, phone, sale_id);
        
        res.json({ 
            success: true, 
            message: 'STK Push sent to phone. Please enter PIN.',
            data: result
        });
    } catch (error) {
        console.error('❌ M-Pesa error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'M-Pesa service unavailable',
            error: error.message 
        });
    }
});

/**
 * 5. MAIN CHECKOUT - UPDATED FOR CROSS-DEPARTMENT ACCESS
 * Route: POST /api/pos/checkout
 * Access: Any logged-in user with POS access
 */
router.post('/checkout', requireAuth, async (req, res) => { // Removed requirePermission middleware
    try {
        const { 
            department, 
            customer_id, 
            items, 
            payment_mode = 'Cash',
            amount_paid = 0,
            notes = '',
            transaction_type = 'normal' // normal or add_to_balance
        } = req.body;

        const userRole = req.user?.role || 'staff';
        const userName = req.user?.display_name || 'Unknown';
        const userId = req.user?.user_id || 'system';

        // Check authentication
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        // Check if user has access to process sales
        if (!hasPOSAccess(userRole)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. POS access required.' 
            });
        }

        // Validate department exists (but don't restrict based on user's department)
        const allowedDepartments = ['Uniform', 'Stationery'];
        if (!allowedDepartments.includes(department)) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid department. Must be one of: ${allowedDepartments.join(', ')}` 
            });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No items in cart' 
            });
        }

        // Validate transaction type
        const validTransactionTypes = ['normal', 'add_to_balance'];
        if (!validTransactionTypes.includes(transaction_type)) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid transaction type. Must be one of: ${validTransactionTypes.join(', ')}` 
            });
        }

        // For add_to_balance, customer_id is required
        if (transaction_type === 'add_to_balance' && !customer_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Customer ID is required for adding to balance' 
            });
        }

        const saleData = {
            department,
            customer_id: customer_id || null,
            items,
            payment_mode,
            amount_paid,
            notes,
            transaction_type
        };

        const userInfo = {
            userId,
            userName,
            userRole: userRole
        };

        const result = await posService.processSale(saleData, userInfo);

        console.log(`✅ Sale processed: ${result.sale_id} for ${customer_id ? 'learner' : 'walk-in'}, total: KES ${result.totals.total}`);

        res.json({
            success: true,
            message: transaction_type === 'add_to_balance' ? 'Sale added to customer balance' : 'Sale completed successfully',
            sale_id: result.sale_id,
            totals: result.totals,
            items_count: items.length,
            department: department,
            customer_id: customer_id || null,
            transaction_type: transaction_type,
            redirect: `/checkout.html?sale_id=${result.sale_id}&type=${transaction_type}`,
            cashier: userName,
            has_cross_access: true
        });

    } catch (error) {
        console.error('❌ Checkout error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Checkout failed'
        });
    }
});

/**
 * 6. QUICK PRODUCT LOOKUP - UPDATED FOR CROSS-DEPARTMENT ACCESS
 * Route: GET /api/pos/lookup/:identifier
 * Access: Any logged-in user with POS access
 */
router.get('/lookup/:identifier', requireAuth, async (req, res) => { // Removed requirePermission middleware
    try {
        const { identifier } = req.params;
        const userRole = req.user?.role || 'Unknown';

        // Check authentication
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        // Check POS access
        if (!hasPOSAccess(userRole)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. POS access required.' 
            });
        }
        
        console.log(`🔎 Quick lookup for: ${identifier} by user: ${req.user?.display_name || 'Unknown'}`);
        
        const userDept = getUserDepartment(userRole);
        const product = await posService.quickLookup(identifier, userDept);
        
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found or access denied' 
            });
        }
        
        res.json({ 
            success: true, 
            product: product,
            has_cross_access: true
        });
    } catch (error) {
        console.error('❌ Product lookup error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lookup failed',
            error: error.message 
        });
    }
});

/**
 * 7. GET LEARNERS BY CLASS
 * Route: GET /api/pos/learners/class/:className
 * Access: Admin + Departments
 */
router.get('/learners/class/:className', requirePermission('pos'), async (req, res) => {
    try {
        const { className } = req.params;
        
        console.log(`📚 Fetching learners for class: ${className} by user: ${req.user?.display_name || 'Unknown'}`);
        
        const learners = await posService.getLearnersByClass(className);
        
        res.json({ 
            success: true, 
            count: learners.length,
            class: className,
            learners: learners
        });
    } catch (error) {
        console.error('❌ Error fetching learners by class:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch learners',
            error: error.message 
        });
    }
});

/**
 * 8. SEARCH LEARNERS
 * Route: GET /api/pos/learners/search?q=search_term
 * Access: Admin + Departments
 */
router.get('/learners/search', requirePermission('pos'), async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                message: 'Search query is required' 
            });
        }
        
        console.log(`🔍 Searching learners for: ${q} by user: ${req.user?.display_name || 'Unknown'}`);
        
        const learners = await posService.searchLearners(q);
        
        res.json({ 
            success: true, 
            count: learners.length,
            learners: learners
        });
    } catch (error) {
        console.error('❌ Error searching learners:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to search learners',
            error: error.message 
        });
    }
});

/**
 * 9. GET LEARNER DETAILS
 * Route: GET /api/pos/learners/:learnerId
 * Access: Admin + Departments
 */
router.get('/learners/:learnerId', requirePermission('pos'), async (req, res) => {
    try {
        const { learnerId } = req.params;
        
        console.log(`👤 Fetching learner details: ${learnerId} by user: ${req.user?.display_name || 'Unknown'}`);
        
        const learner = await posService.getLearnerById(learnerId);
        
        if (!learner) {
            return res.status(404).json({ 
                success: false, 
                message: 'Learner not found' 
            });
        }
        
        res.json({ 
            success: true, 
            learner: learner
        });
    } catch (error) {
        console.error('❌ Error fetching learner details:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch learner',
            error: error.message 
        });
    }
});

/**
 * 10. GET ALL CLASSES
 * Route: GET /api/pos/classes
 * Access: Admin + Departments
 */
router.get('/classes', requirePermission('pos'), async (req, res) => {
    try {
        console.log(`📚 Fetching all classes by user: ${req.user?.display_name || 'Unknown'}`);
        
        const classes = await posService.getUniqueClasses();
        
        res.json({ 
            success: false, 
            count: classes.length,
            classes: classes
        });
    } catch (error) {
        console.error('❌ Error fetching classes:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch classes',
            error: error.message 
        });
    }
});
/**
 * 11. GET DEPARTMENTS FOR DROPDOWN
 * Route: GET /api/pos/departments
 * Access: Any logged-in user
 */
router.get('/departments', requireAuth, async (req, res) => {
    try {
        // Return hardcoded departments since your system uses Uniform/Stationery
        const departments = [
            { id: 'uniform', name: 'Uniform Department' },
            { id: 'stationery', name: 'Stationery Department' }
        ];
        
        res.json({ 
            success: true, 
            departments: departments
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch departments',
            error: error.message 
        });
    }
});

/**
 * DEBUG: Track API calls
 * Route: GET /api/pos/debug/calls
 * Access: Admin only
 */
let apiCallLog = [];
const MAX_LOG_SIZE = 100;

router.get('/debug/calls', requirePermission('admin'), (req, res) => {
    const callInfo = {
        timestamp: new Date().toISOString(),
        endpoint: req.originalUrl,
        method: req.method,
        user: req.user?.display_name || 'Unknown',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer') || 'Direct'
    };
    
    apiCallLog.unshift(callInfo);
    if (apiCallLog.length > MAX_LOG_SIZE) {
        apiCallLog = apiCallLog.slice(0, MAX_LOG_SIZE);
    }
    
    res.json({
        success: true,
        recent_calls: apiCallLog,
        total_calls_logged: apiCallLog.length
    });
});

// Middleware to log all POS API calls
router.use((req, res, next) => {
    const posEndpoints = ['/api/pos/products/', '/api/pos/search', '/api/pos/checkout'];
    const isPosEndpoint = posEndpoints.some(endpoint => req.originalUrl.includes(endpoint));
    
    if (isPosEndpoint) {
        const callInfo = {
            timestamp: new Date().toISOString(),
            endpoint: req.originalUrl,
            method: req.method,
            user: req.user?.display_name || 'Unknown',
            userAgent: req.get('User-Agent')?.substring(0, 50) || 'Unknown',
            referer: req.get('Referer') || 'Direct'
        };
        
        apiCallLog.unshift(callInfo);
        if (apiCallLog.length > MAX_LOG_SIZE) {
            apiCallLog = apiCallLog.slice(0, MAX_LOG_SIZE);
        }
        
        console.log(`🔍 POS API Call: ${req.method} ${req.originalUrl} by ${callInfo.user} from ${callInfo.referer}`);
    }
    
    next();
});

module.exports = router;