// backend/services/inventoryService.js
const db = require('../config/database');

const TABLE = require('../config/table-map');
class InventoryService {
    // =============== PRODUCT CRUD OPERATIONS ===============

    /**
     * Get all active products with optional filtering
     */
    async getAllProducts(filters = {}) {
        try {
            const { department, category, active = true } = filters;
            let query = `
                SELECT 
                    product_id, sku, name, description, department, category,
                    buy_price, sell_price, stock_qty, reorder_level, supplier_id,
                    is_allocatable, active, created_at, updated_at
                FROM ${TABLE.products}
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 0;

            if (department && department !== 'all') {
                paramCount++;
                query += ` AND department = $${paramCount}`;
                params.push(department);
            }

            if (category && category !== 'all') {
                paramCount++;
                query += ` AND category = $${paramCount}`;
                params.push(category);
            }

            if (active !== 'all') {
                paramCount++;
                query += ` AND active = $${paramCount}`;
                params.push(active === true || active === 'true');
            }

            query += ` ORDER BY name ASC`;
            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting all products:', error);
            throw error;
        }
    }

    /**
     * Get product by ID
     */
    async findProductById(productId) {
        try {
            const result = await db.query(
                `SELECT * FROM ${TABLE.products} WHERE product_id = $1`,
                [productId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error finding product by ID:', error);
            throw error;
        }
    }

    /**
     * Get product by SKU
     */
    async findProductBySku(sku) {
        try {
            const result = await db.query(
                `SELECT * FROM ${TABLE.products} WHERE sku = $1`,
                [sku]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error finding product by SKU:', error);
            throw error;
        }
    }

    /**
     * Get product by ID or SKU
     */
    async findProductByIdentifier(identifier) {
        try {
            // Try by SKU first
            let product = await this.findProductBySku(identifier);
            
            // If not found by SKU, try by product_id
            if (!product) {
                product = await this.findProductById(identifier);
            }
            
            return product;
        } catch (error) {
            console.error('Error finding product by identifier:', error);
            throw error;
        }
    }

    /**
     * Create new product
     */
    async createProduct(productData) {
        try {
            const {
                sku, name, description, department, category,
                buy_price, sell_price, stock_qty, reorder_level,
                supplier_id, is_allocatable
            } = productData;

            // Validate required fields
            if (!name || !department || buy_price === undefined || sell_price === undefined) {
                throw new Error('Missing required fields: name, department, buy_price, sell_price');
            }

            // Check if SKU already exists
            if (sku) {
                const existingProduct = await this.findProductBySku(sku);
                if (existingProduct) {
                    throw new Error(`SKU "${sku}" already exists for product "${existingProduct.name}"`);
                }
            }

            // Generate SKU if not provided
            const finalSku = sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

            const result = await db.query(
                `INSERT INTO ${TABLE.products} (
                    sku, name, description, department, category,
                    buy_price, sell_price, stock_qty, reorder_level,
                    supplier_id, is_allocatable, active,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), NOW())
                RETURNING *`,
                [
                    finalSku,
                    name,
                    description || '',
                    department,
                    category || 'Uncategorized',
                    parseFloat(buy_price) || 0,
                    parseFloat(sell_price) || 0,
                    parseInt(stock_qty) || 0,
                    parseInt(reorder_level) || 5,
                    supplier_id || null,
                    is_allocatable || false
                ]
            );

            return result.rows[0];
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    }

    /**
     * Update ${TABLE.products}
     */
    async updateProduct(productId, updates) {
        try {
            // Build dynamic update query
            const fields = [];
            const values = [];
            let paramCount = 0;

            // Don't allow updating product_id
            const allowedFields = [
                'sku', 'name', 'description', 'department', 'category',
                'buy_price', 'sell_price', 'stock_qty', 'reorder_level',
                'supplier_id', 'is_allocatable', 'active'
            ];

            // Check if new SKU already exists (if changing SKU)
            if (updates.sku) {
                const currentProduct = await this.findProductById(productId);
                if (currentProduct && updates.sku !== currentProduct.sku) {
                    const existingBySku = await this.findProductBySku(updates.sku);
                    if (existingBySku) {
                        throw new Error(`SKU "${updates.sku}" already exists`);
                    }
                }
            }

            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key) && updates[key] !== undefined) {
                    paramCount++;
                    fields.push(`${key} = $${paramCount}`);
                    
                    // Parse numeric fields
                    if (['buy_price', 'sell_price'].includes(key)) {
                        values.push(parseFloat(updates[key]) || 0);
                    } else if (['stock_qty', 'reorder_level'].includes(key)) {
                        values.push(parseInt(updates[key]) || 0);
                    } else if (key === 'active') {
                        values.push(updates[key] === true || updates[key] === 'true');
                    } else {
                        values.push(updates[key]);
                    }
                }
            });

            if (fields.length === 0) {
                throw new Error('No valid fields to update');
            }

            // Add updated_at
            paramCount++;
            fields.push(`updated_at = $${paramCount}`);
            values.push(new Date());

            // Add product_id as last parameter
            paramCount++;
            values.push(productId);

            const query = `
                UPDATE ${TABLE.products} 
                SET ${fields.join(', ')}
                WHERE product_id = $${paramCount}
                RETURNING *
            `;

            const result = await db.query(query, values);
            
            if (result.rows.length === 0) {
                throw new Error('Product not found');
            }

            return result.rows[0];
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    /**
     * Delete product (soft delete - set active to false)
     */
    async deleteProduct(productId) {
        try {
            // Soft delete - set active to false
            const result = await this.updateProduct(productId, { active: false });
            return { name: result.name, sku: result.sku };
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }

    // =============== STOCK MANAGEMENT ===============

    /**
     * Update ${TABLE.products} stock quantity
     */
    async updateProductStock(productId, quantityChange) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            // Get current product with FOR UPDATE lock
            const productResult = await client.query(
                `SELECT * FROM ${TABLE.products} WHERE product_id = $1 FOR UPDATE`,
                [productId]
            );

            if (productResult.rows.length === 0) {
                throw new Error(`Product not found: ${productId}`);
            }

            const product = productResult.rows[0];
            const currentStock = Number(product.stock_qty) || 0;
            const newStock = currentStock + quantityChange;

            // Check for insufficient stock
            if (newStock < 0) {
                throw new Error(`Insufficient stock for ${product.name}. Available: ${currentStock}, Requested: ${-quantityChange}`);
            }

            // Update ${TABLE.products}
            await client.query(
                `UPDATE ${TABLE.products} 
                 SET stock_qty = $1, updated_at = NOW()
                 WHERE product_id = $2`,
                [newStock, productId]
            );

            await client.query('COMMIT');

            return {
                product_id: productId,
                sku: product.sku,
                name: product.name,
                previous_stock: currentStock,
                new_stock: newStock,
                is_low_stock: newStock <= (Number(product.reorder_level) || 0)
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating product stock:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Restock product with recording
     */
    async restockProduct(productId, quantity, buyPrice, sellPrice, supplierId, notes) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            if (!quantity || quantity <= 0) {
                throw new Error('Quantity must be a positive number');
            }

            // Get product details
            const productResult = await client.query(
                `SELECT * FROM ${TABLE.products} WHERE product_id = $1 FOR UPDATE`,
                [productId]
            );

            if (productResult.rows.length === 0) {
                throw new Error('Product not found');
            }

            const product = productResult.rows[0];

            // Update ${TABLE.products}
            const stockUpdate = await this.updateProductStock(productId, parseInt(quantity));

            // Update prices if provided
            const updates = {};
            
            if (buyPrice !== undefined) {
                updates.buy_price = parseFloat(buyPrice);
            }
            
            if (sellPrice !== undefined) {
                updates.sell_price = parseFloat(sellPrice);
            }
            
            if (Object.keys(updates).length > 0) {
                await this.updateProduct(productId, updates);
            }

            // Record restock transaction
            const restockData = {
                restock_id: require('uuid').v4(), // In real app, import uuid
                supplier_id: supplierId || product.supplier_id,
                date: new Date(),
                total_cost: (parseFloat(buyPrice) || product.buy_price) * parseInt(quantity),
                expected_profit: (parseFloat(sellPrice) || product.sell_price - parseFloat(buyPrice) || product.buy_price) * parseInt(quantity),
                recorded_by: 'System', // Will come from auth in routes
                status: 'pending_payment'
            };

            // Add to restocks table
            await client.query(
                `INSERT INTO ${TABLE.restocks} (
                    restock_id, supplier_id, date, total_cost,
                    expected_profit, recorded_by, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [
                    restockData.restock_id,
                    restockData.supplier_id,
                    restockData.date,
                    restockData.total_cost,
                    restockData.expected_profit,
                    restockData.recorded_by,
                    restockData.status
                ]
            );

            await client.query('COMMIT');

            return {
                product: {
                    ...product,
                    stock_qty: stockUpdate.new_stock,
                    buy_price: buyPrice ? parseFloat(buyPrice) : product.buy_price,
                    sell_price: sellPrice ? parseFloat(sellPrice) : product.sell_price
                },
                restock: restockData,
                stock_update: stockUpdate
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error restocking product:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get low stock products
     */
    async getLowStockProducts() {
        try {
            const result = await db.query(
                `SELECT * FROM ${TABLE.products} 
                 WHERE active = true 
                 AND stock_qty <= reorder_level
                 ORDER BY 
                     CASE 
                         WHEN stock_qty = 0 THEN 0
                         ELSE 1
                     END,
                     stock_qty ASC`
            );

            const products = result.rows;
            const criticalProducts = products.filter(p => p.stock_qty === 0);
            const warningProducts = products.filter(p => p.stock_qty > 0 && p.stock_qty <= p.reorder_level);

            return {
                critical: criticalProducts,
                warning: warningProducts,
                all: products
            };
        } catch (error) {
            console.error('Error getting low stock products:', error);
            throw error;
        }
    }

    // =============== SEARCH & REPORTS ===============

    /**
     * Search products by name, SKU, or description
     */
    async searchProducts(query) {
        try {
            if (!query || query.trim() === '') {
                return [];
            }

            const searchTerm = `%${query}%`;
            const result = await db.query(
                `SELECT * FROM ${TABLE.products} 
                 WHERE active = true 
                 AND (
                     name ILIKE $1 OR
                     sku ILIKE $1 OR
                     description ILIKE $1 OR
                     category ILIKE $1
                 )
                 ORDER BY name ASC`,
                [searchTerm]
            );

            return result.rows;
        } catch (error) {
            console.error('Error searching products:', error);
            throw error;
        }
    }

    /**
 * Get inventory dashboard statistics - FIXED VERSION
 */
async getInventoryDashboard() {
    try {
        // Get all active products
        const productsResult = await db.query(
            `SELECT * FROM ${TABLE.products} WHERE active = true`
        );

        const products = productsResult.rows;
        
        // Calculate stats WITH NULL CHECKS
        const totalProducts = products.length || 0;
        
        // Use Number() to ensure values are numbers, not undefined
        const totalValue = products.reduce((sum, p) => {
            const stock = Number(p.stock_qty) || 0;
            const price = Number(p.sell_price) || 0;
            return sum + (stock * price);
        }, 0);
        
        const totalCost = products.reduce((sum, p) => {
            const stock = Number(p.stock_qty) || 0;
            const cost = Number(p.buy_price) || 0;
            return sum + (stock * cost);
        }, 0);
        
        const lowStockProducts = products.filter(p => {
            const stock = Number(p.stock_qty) || 0;
            const reorder = Number(p.reorder_level) || 5;
            return stock <= reorder;
        });
        
        const lowStockCount = lowStockProducts.length || 0;
        const outOfStockCount = lowStockProducts.filter(p => (Number(p.stock_qty) || 0) === 0).length || 0;
        
        // Department breakdown WITH NULL CHECKS
        const departments = {};
        products.forEach(p => {
            const dept = p.department || 'Unknown';
            if (!departments[dept]) {
                departments[dept] = {
                    count: 0,
                    value: 0,
                    cost: 0,
                    low_stock: 0,
                    products: []
                };
            }
            departments[dept].count++;
            
            const stock = Number(p.stock_qty) || 0;
            const sellPrice = Number(p.sell_price) || 0;
            const buyPrice = Number(p.buy_price) || 0;
            
            departments[dept].value += stock * sellPrice;
            departments[dept].cost += stock * buyPrice;
            
            const reorder = Number(p.reorder_level) || 5;
            if (stock <= reorder) {
                departments[dept].low_stock++;
            }
        });

        // Recent activity (last 7 days sales)
        const today = new Date();
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        let recentSales = 0;
        try {
            const salesResult = await db.query(
                `SELECT COUNT(*) as count FROM ${TABLE.sales} 
                 WHERE date >= $1 AND status = 'completed'`,
                [sevenDaysAgo]
            );
            recentSales = parseInt(salesResult.rows[0]?.count) || 0;
        } catch (salesError) {
            console.warn('Could not fetch recent sales:', salesError);
            recentSales = 0;
        }

        // Return with consistent property names
        const result = {
            totalProducts: totalProducts,
            totalValue: totalValue,
            totalCost: totalCost,
            lowStockCount: lowStockCount,
            outOfStockCount: outOfStockCount,
            recentSales: recentSales,
            departments: departments,
            
            // Also include alternative property names for compatibility
            total_products: totalProducts,
            total_inventory_value: totalValue,
            total_inventory_cost: totalCost,
            low_stock_items: lowStockCount,
            out_of_stock: outOfStockCount,
            recent_sales_7days: recentSales
        };
        
        console.log('📊 Dashboard data calculated:', {
            totalProducts,
            totalValue,
            totalCost,
            lowStockCount,
            outOfStockCount
        });
        
        return result;
    } catch (error) {
        console.error('Error getting inventory dashboard:', error);
        
        // Return safe defaults instead of throwing
        return {
            totalProducts: 0,
            totalValue: 0,
            totalCost: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            recentSales: 0,
            departments: {},
            total_products: 0,
            total_inventory_value: 0,
            total_inventory_cost: 0,
            low_stock_items: 0,
            out_of_stock: 0,
            recent_sales_7days: 0
        };
    }
}

    /**
     * Get product sales history
     */
    async getProductSalesHistory(productId, limit = 10) {
        try {
            const result = await db.query(
                `SELECT 
                    si.sale_item_id, si.sale_id, si.qty, si.unit_price, si.total_price,
                    s.date, s.customer_id, s.department, s.served_by
                 FROM ${TABLE.sale_items} si
                 JOIN ${TABLE.sales} s ON si.sale_id = s.sale_id
                 WHERE si.product_id = $1
                 ORDER BY s.date DESC
                 LIMIT $2`,
                [productId, limit]
            );

            return result.rows;
        } catch (error) {
            console.error('Error getting product sales history:', error);
            throw error;
        }
    }

    /**
     * Get unique departments
     */
    async getUniqueDepartments() {
        try {
            const result = await db.query(
                `SELECT DISTINCT department 
                 FROM ${TABLE.products} 
                 WHERE department IS NOT NULL AND department <> ''
                 ORDER BY department`
            );
            return result.rows.map(row => row.department);
        } catch (error) {
            console.error('Error getting unique departments:', error);
            throw error;
        }
    }

    /**
     * Get unique categories
     */
    async getUniqueCategories() {
        try {
            const result = await db.query(
                `SELECT DISTINCT category 
                 FROM ${TABLE.products} 
                 WHERE category IS NOT NULL AND category <> ''
                 ORDER BY category`
            );
            return result.rows.map(row => row.category);
        } catch (error) {
            console.error('Error getting unique categories:', error);
            throw error;
        }
    }
}

module.exports = new InventoryService();