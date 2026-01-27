// backend/routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const inventoryService = require('../services/inventoryService');
const { v4: uuidv4 } = require('uuid');

// Uncomment if you have auth middleware
// const { requirePermission } = require('../middleware/authMiddleware');

// Helper function for validation
const validateNumericFields = (fields) => {
    const errors = [];
    
    if (fields.buy_price !== undefined && (isNaN(fields.buy_price) || fields.buy_price < 0)) {
        errors.push('buy_price must be a positive number');
    }
    
    if (fields.sell_price !== undefined && (isNaN(fields.sell_price) || fields.sell_price < 0)) {
        errors.push('sell_price must be a positive number');
    }
    
    if (fields.stock_qty !== undefined && (isNaN(fields.stock_qty) || fields.stock_qty < 0)) {
        errors.push('stock_qty must be a positive number or zero');
    }
    
    if (fields.reorder_level !== undefined && (isNaN(fields.reorder_level) || fields.reorder_level < 0)) {
        errors.push('reorder_level must be a positive number or zero');
    }
    
    if (fields.quantity !== undefined && (isNaN(fields.quantity) || fields.quantity <= 0)) {
        errors.push('quantity must be a positive number');
    }
    
    return errors;
};

/**
 * GET /api/inventory/products
 * Get all active products with standardization
 * Access: Admin only
 */
router.get('/products', /* requirePermission('inventory'), */ async (req, res) => {
    try {
        const products = await inventoryService.getAllProducts();
        
        res.json({
            success: true,
            count: products.length,
            products: products.map(product => ({
                product_id: product.product_id,
                sku: product.sku,
                name: product.name,
                description: product.description || '',
                department: product.department,
                category: product.category || 'Uncategorized',
                buy_price: parseFloat(product.buy_price) || 0,
                sell_price: parseFloat(product.sell_price) || 0,
                stock_qty: parseInt(product.stock_qty) || 0,
                reorder_level: parseInt(product.reorder_level) || 5,
                supplier_id: product.supplier_id || '',
                created_at: product.created_at,
                updated_at: product.updated_at,
                active: product.active
            }))
        });
    } catch (error) {
        console.error('❌ Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
});

/**
 * GET /api/inventory/products/:identifier
 * Get product by ID or SKU
 * Access: Admin only
 */
router.get('/products/:identifier', /* requirePermission('inventory'), */ async (req, res) => {
    try {
        const { identifier } = req.params;
        
        const product = await inventoryService.findProductByIdentifier(identifier);
        
        if (!product || !product.active) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Get sales history for this product (same as Excel logic)
        const productSales = await inventoryService.getProductSalesHistory(product.product_id);
        
        // Get restock history (same as Excel logic)
        const productRestocks = await inventoryService.getProductRestockHistory(product.product_id);

        res.json({
            success: true,
            product: {
                ...product,
                recent_sales: productSales,
                restock_history: productRestocks,
                inventory_value: (Number(product.stock_qty) || 0) * (Number(product.sell_price) || 0),
                cost_value: (Number(product.stock_qty) || 0) * (Number(product.buy_price) || 0),
                profit_per_unit: (Number(product.sell_price) || 0) - (Number(product.buy_price) || 0),
                markup_percentage: Number(product.buy_price) > 0 
                    ? ((Number(product.sell_price) - Number(product.buy_price)) / Number(product.buy_price) * 100).toFixed(2)
                    : 0
            }
        });
    } catch (error) {
        console.error('❌ Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: error.message
        });
    }
});

/**
 * POST /api/inventory/products
 * Create new product with SKU support
 * Access: Admin only
 */
router.post('/products', /* requirePermission('inventory'), */ async (req, res) => {
    try {
        const { 
            name, 
            department, 
            category,
            description,
            buy_price, 
            sell_price, 
            stock_qty,
            reorder_level,
            sku,
            supplier_id
        } = req.body;

        // Validate required fields
        if (!name || !department || !buy_price || !sell_price) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, department, buy_price, sell_price'
            });
        }

        // Validate numeric fields
        const numericErrors = validateNumericFields({ buy_price, sell_price, stock_qty, reorder_level });
        if (numericErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: numericErrors
            });
        }

        // Validate sell price > buy price
        if (parseFloat(sell_price) <= parseFloat(buy_price)) {
            return res.status(400).json({
                success: false,
                message: 'Sell price must be greater than buy price'
            });
        }

        const productData = {
            name,
            department,
            category: category || 'Uncategorized',
            description: description || '',
            buy_price: parseFloat(buy_price),
            sell_price: parseFloat(sell_price),
            stock_qty: parseInt(stock_qty) || 0,
            reorder_level: parseInt(reorder_level) || 5,
            sku: sku || undefined,
            supplier_id: supplier_id || ''
        };

        const product = await inventoryService.createProduct(productData);

        console.log(`✅ Product created: ${product.name} (${product.sku})`);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product: product
        });
    } catch (error) {
        console.error('❌ Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product',
            error: error.message
        });
    }
});

/**
 * PUT /api/inventory/products/:identifier
 * Update product
 * Access: Admin only
 */
router.put('/products/:identifier', /* requirePermission('inventory'), */ async (req, res) => {
    try {
        const { identifier } = req.params;
        const updates = req.body;
        
        const product = await inventoryService.findProductByIdentifier(identifier);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Don't allow updating ID (same as Excel)
        delete updates.product_id;
        
        // Add update timestamp - use Date object to match service expectation
        updates.updated_at = new Date();

        // Validate numeric fields if provided
        const numericErrors = validateNumericFields(updates);
        if (numericErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: numericErrors
            });
        }

        // Validate sell price > buy price if both are being updated
        if (updates.sell_price !== undefined && updates.buy_price !== undefined) {
            if (parseFloat(updates.sell_price) <= parseFloat(updates.buy_price)) {
                return res.status(400).json({
                    success: false,
                    message: 'Sell price must be greater than buy price'
                });
            }
        } else if (updates.sell_price !== undefined && parseFloat(updates.sell_price) <= parseFloat(product.buy_price)) {
            return res.status(400).json({
                success: false,
                message: 'Sell price must be greater than current buy price'
            });
        } else if (updates.buy_price !== undefined && parseFloat(product.sell_price) <= parseFloat(updates.buy_price)) {
            return res.status(400).json({
                success: false,
                message: 'Buy price must be less than current sell price'
            });
        }

        const updatedProduct = await inventoryService.updateProduct(product.product_id, updates);

        console.log(`✅ Product updated: ${updatedProduct.name} (${updatedProduct.sku})`);

        res.json({
            success: true,
            message: 'Product updated successfully',
            product: updatedProduct
        });
    } catch (error) {
        console.error('❌ Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product',
            error: error.message
        });
    }
});

/**
 * DELETE /api/inventory/products/:identifier
 * Soft delete product (set active to false)
 * Access: Admin only
 */
router.delete('/products/:identifier', /* requirePermission('inventory'), */ async (req, res) => {
    try {
        const { identifier } = req.params;
        
        const product = await inventoryService.findProductByIdentifier(identifier);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if product has stock before deactivating
        if (product.stock_qty > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate product with existing stock. Please set stock to zero first.'
            });
        }

        // Soft delete - set active to false (same as Excel)
        const updatedProduct = await inventoryService.updateProduct(product.product_id, {
            active: false,
            updated_at: new Date()  // Use Date object, not ISO string
        });

        console.log(`✅ Product deactivated: ${updatedProduct.name} (${updatedProduct.sku})`);

        res.json({
            success: true,
            message: 'Product deactivated successfully',
            product: updatedProduct
        });
    } catch (error) {
        console.error('❌ Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product',
            error: error.message
        });
    }
});

/**
 * POST /api/inventory/products/:identifier/restock
 * Restock product with quantity adjustment
 * Access: Admin only
 */
router.post('/products/:identifier/restock', /* requirePermission('inventory'), */ async (req, res) => {
    try {
        const { identifier } = req.params;
        const { quantity, buy_price, sell_price, supplier_id, notes } = req.body;
        
        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be a positive number'
            });
        }
        
        // Validate numeric fields
        const numericErrors = validateNumericFields({ quantity, buy_price, sell_price });
        if (numericErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: numericErrors
            });
        }
        
        const product = await inventoryService.findProductByIdentifier(identifier);
        
        if (!product || !product.active) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Get recorded_by from auth (same as Excel)
        // In a real app, you'd get this from req.user
        // For now, use a placeholder or get from request headers
        const recorded_by = req.user ? req.user.displayName : 
                           req.headers['x-user-name'] || 
                           'System';

        const result = await inventoryService.restockProduct(
            product.product_id,
            quantity,
            buy_price,
            sell_price,
            supplier_id,
            notes || '',
            recorded_by
        );

        console.log(`📦 Restocked ${quantity} units of ${product.name} (${product.sku}) by ${recorded_by}`);

        res.json({
            success: true,
            message: `Restocked ${quantity} units successfully`,
            product: {
                ...product,
                stock_qty: result.stock_update.new_stock,
                buy_price: buy_price ? parseFloat(buy_price) : product.buy_price,
                sell_price: sell_price ? parseFloat(sell_price) : product.sell_price
            },
            restock: result.restock
        });
    } catch (error) {
        console.error('❌ Restock error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to restock product',
            error: error.message
        });
    }
});

/**
 * POST /api/inventory/products/:identifier/adjust-stock
 * Adjust stock directly (increase or decrease)
 * Access: Admin only
 */
router.post('/products/:identifier/adjust-stock', /* requirePermission('inventory'), */ async (req, res) => {
    try {
        const { identifier } = req.params;
        const { quantity, reason, notes } = req.body;
        
        if (!quantity || isNaN(quantity)) {
            return res.status(400).json({
                success: false,
                message: 'Valid quantity is required'
            });
        }
        
        const product = await inventoryService.findProductByIdentifier(identifier);
        
        if (!product || !product.active) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const result = await inventoryService.updateProductStock(product.product_id, parseInt(quantity));

        console.log(`📊 Stock adjusted for ${product.name}: ${quantity > 0 ? '+' : ''}${quantity} units. Reason: ${reason || 'Manual adjustment'}`);

        res.json({
            success: true,
            message: `Stock adjusted by ${quantity} units`,
            adjustment: {
                product_id: product.product_id,
                sku: product.sku,
                name: product.name,
                previous_stock: parseInt(product.stock_qty) || 0,
                new_stock: result.new_stock,
                change: parseInt(quantity),
                reason: reason || 'Manual adjustment',
                notes: notes || '',
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('❌ Adjust stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to adjust stock',
            error: error.message
        });
    }
});

/**
 * GET /api/inventory/low-stock
 * Get low stock products
 * Access: Admin only
 */
router.get('/low-stock', /* requirePermission('inventory'), */ async (req, res) => {
    try {
        const lowStockProducts = await inventoryService.getLowStockProducts();
        
        const criticalProducts = lowStockProducts.filter(p => p.stock_qty === 0);
        const warningProducts = lowStockProducts.filter(p => p.stock_qty > 0 && p.stock_qty <= p.reorder_level);
        
        res.json({
            success: true,
            stats: {
                critical: criticalProducts.length,
                warning: warningProducts.length,
                total: lowStockProducts.length
            },
            critical: criticalProducts.map(p => ({
                product_id: p.product_id,
                sku: p.sku,
                name: p.name,
                department: p.department,
                current_stock: p.stock_qty,
                reorder_level: p.reorder_level,
                needed: Math.max(p.reorder_level * 2 - p.stock_qty, 10)
            })),
            warning: warningProducts.map(p => ({
                product_id: p.product_id,
                sku: p.sku,
                name: p.name,
                department: p.department,
                current_stock: p.stock_qty,
                reorder_level: p.reorder_level,
                needed: Math.max(p.reorder_level * 1.5 - p.stock_qty, 5)
            }))
        });
    } catch (error) {
        console.error('❌ Low stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch low stock products',
            error: error.message
        });
    }
});

/**
 * GET /api/inventory/search
 * Search products by name, SKU, or description
 * Access: Admin only
 */
router.get('/search', /* requirePermission('inventory'), */ async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        const results = await inventoryService.searchProducts(q);
        
        res.json({
            success: true,
            count: results.length,
            query: q,
            products: results
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
 * /**
 * GET /api/inventory/dashboard
 * Get inventory dashboard stats
 * Access: Admin only
 */
router.get('/dashboard', /* requirePermission('inventory'), */ async (req, res) => {
    try {
        const dashboardData = await inventoryService.getInventoryDashboard();
        
        res.json({
            success: true,
            stats: {
                total_products: dashboardData.totalProducts,
                active_products: dashboardData.activeProducts,
                total_inventory_value: parseFloat(dashboardData.totalValue.toFixed(2)),
                total_inventory_cost: parseFloat(dashboardData.totalCost.toFixed(2)),
                potential_profit: parseFloat((dashboardData.totalValue - dashboardData.totalCost).toFixed(2)),
                low_stock_items: dashboardData.lowStockCount,
                out_of_stock: dashboardData.outOfStockCount,
                recent_sales_7days: dashboardData.recentSales,
                departments: dashboardData.departments
            }
        });
    } catch (error) {
        console.error('❌ Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard stats',
            error: error.message
        });
    }
});

/**
 * GET /api/inventory/activity
 * Get recent inventory activity (sales, restocks)
 * Access: Admin only
 */
router.get('/activity', /* requirePermission('inventory'), */ async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        // Get recent sales
        const allSales = await inventoryService.getAllSales();
        const recentSales = allSales.slice(0, Math.min(limit, allSales.length));
        
        // Get recent restocks
        const allRestocks = await inventoryService.getAllRestocks();
        const recentRestocks = allRestocks.slice(0, Math.min(limit, allRestocks.length));
        
        // Combine and sort by date
        const recentActivity = [
            ...recentSales.map(sale => ({
                type: 'sale',
                id: sale.sale_id,
                date: sale.date,
                amount: sale.total_amount,
                items_count: sale.items_count || 0,
                status: sale.status,
                recorded_by: sale.recorded_by
            })),
            ...recentRestocks.map(restock => ({
                type: 'restock',
                id: restock.restock_id,
                date: restock.date,
                amount: restock.total_cost,
                items_count: 1, // Simplified - in reality you'd query restock_items count
                status: restock.status,
                recorded_by: restock.recorded_by
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date))
         .slice(0, limit);

        res.json({
            success: true,
            activity: recentActivity
        });
    } catch (error) {
        console.error('❌ Activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activity',
            error: error.message
        });
    }
});

module.exports = router;