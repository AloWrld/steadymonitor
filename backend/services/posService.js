// backend/services/posService.js
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const TABLE = require('../config/table-map');
class PosService {
    // =============== PRODUCT CATALOG ===============

   // backend/services/posService.js

async getProductsByDepartment(department, userId = null, userRole = null) {
    try {
        // Validate department
        const validDepartments = ['Uniform', 'Stationery'];
        if (!validDepartments.includes(department)) {
            throw new Error(`Invalid department. Must be one of: ${validDepartments.join(', ')}`);
        }

        // REMOVE strict department enforcement - allow cross-access
        // if (userRole && userRole !== 'admin' && userRole !== department) {
        //     throw new Error(`Access denied. You can only access ${userRole} products.`);
        // }

        const query = `
            SELECT 
                product_id,
                sku,
                name,
                description,
                department,
                category,
                buy_price,
                sell_price,
                stock_qty,
                reorder_level,
                is_allocatable,
                active
            FROM ${TABLE.products} 
            WHERE department = $1 AND active = TRUE
            ORDER BY category, name
        `;

        const result = await db.query(query, [department]);
        return result.rows;
    } catch (error) {
        console.error('Error getting products by department:', error);
        throw error;
    }
}

    async searchProducts(searchTerm, userDepartment = null) {
        try {
            if (!searchTerm || searchTerm.trim() === '') {
                return [];
            }

            let query = `
                SELECT 
                    product_id,
                    sku,
                    name,
                    description,
                    department,
                    category,
                    sell_price,
                    stock_qty
                FROM ${TABLE.products} 
                WHERE active = TRUE 
                  AND (sku ILIKE $1 OR name ILIKE $1 OR description ILIKE $1)
            `;

            const params = [`%${searchTerm}%`];

            // Filter by department for department users
            if (userDepartment && userDepartment !== 'admin') {
                query += ` AND department = $2`;
                params.push(userDepartment);
            }

            query += ` ORDER BY department, name LIMIT 50`;

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error searching products:', error);
            throw error;
        }
    }

    async findProductById(productId) {
        try {
            const result = await db.query(
                `SELECT * FROM ${TABLE.products} WHERE product_id = $1 AND active = TRUE`,
                [productId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error finding product by ID:', error);
            throw error;
        }
    }

    async findProductBySku(sku) {
        try {
            const result = await db.query(
                `SELECT * FROM ${TABLE.products} WHERE sku = $1 AND active = TRUE`,
                [sku]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error finding product by SKU:', error);
            throw error;
        }
    }

    async validateProductAccess(productId, userDepartment) {
        try {
            const product = await this.findProductById(productId);
            if (!product) {
                return { valid: false, message: 'Product not found' };
            }

            if (userDepartment !== 'admin' && product.department !== userDepartment) {
                return { 
                    valid: false, 
                    message: `Access denied. This product belongs to ${product.department} department.` 
                };
            }

            return { valid: true, product };
        } catch (error) {
            console.error('Error validating product access:', error);
            throw error;
        }
    }

    // =============== LEARNER MANAGEMENT ===============

    async getLearnersByClass(className, userDepartment = null) {
        try {
            let query = `
                SELECT 
                    customer_id,
                    name,
                    class,
                    boarding_status,
                    program_membership,
                    pocket_money_enabled,
                    pocket_money_balance,
                    total_items_cost,
                    amount_paid,
                    balance,
                    parent_name,
                    parent_phone
                FROM ${TABLE.customers} 
                WHERE class = $1
                ORDER BY name
            `;

            const result = await db.query(query, [className]);
            return result.rows;
        } catch (error) {
            console.error('Error getting learners by class:', error);
            throw error;
        }
    }

    async getLearnerById(learnerId) {
        try {
            const result = await db.query(
                `SELECT * FROM ${TABLE.customers} WHERE customer_id = $1`,
                [learnerId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting learner by ID:', error);
            throw error;
        }
    }

    async searchLearners(searchTerm) {
        try {
            if (!searchTerm || searchTerm.trim() === '') {
                return [];
            }

            const query = `
                SELECT 
                    customer_id,
                    name,
                    class,
                    program_membership,
                    balance,
                    parent_name
                FROM ${TABLE.customers} 
                WHERE name ILIKE $1 OR customer_id::text ILIKE $1
                ORDER BY name
                LIMIT 20
            `;

            const result = await db.query(query, [`%${searchTerm}%`]);
            return result.rows;
        } catch (error) {
            console.error('Error searching learners:', error);
            throw error;
        }
    }

    async getUniqueClasses() {
        try {
            const result = await db.query(`
                SELECT DISTINCT class 
                FROM ${TABLE.customers} 
                WHERE class IS NOT NULL AND class <> ''
                ORDER BY class
            `);
            return result.rows.map(row => row.class);
        } catch (error) {
            console.error('Error getting unique classes:', error);
            throw error;
        }
    }

    generateSaleId() {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        const randomNum = Math.floor(10000 + Math.random() * 90000); // 5-digit random
        return `SAL-${dateStr}-${randomNum}`;
    }

        // =============== SALE PROCESSING ===============

    async processSale(saleData, userInfo) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const {
                department,
                customer_id,
                items,
                payment_mode = 'cash',
                amount_paid = 0,
                notes = '',
                transaction_type = 'normal' // normal, add_to_balance
            } = saleData;

            const { userId, userName, userRole } = userInfo;

            // 1. Validate department access
            if (userRole !== 'admin' && userRole !== department) {
                throw new Error(`Access denied. You can only process sales for ${userRole} department.`);
            }

            // 2. Validate items and calculate totals
            let subtotal = 0;
            let tax = 0;
            const validatedItems = [];

            for (const item of items) {
                const product = await this.findProductById(item.product_id);
                if (!product) {
                    throw new Error(`Product not found: ${item.product_id}`);
                }

                // Validate department access for each item
                if (userRole !== 'admin' && product.department !== department) {
                    throw new Error(`Product ${product.name} belongs to ${product.department} department.`);
                }

                // Check stock
                const quantity = parseInt(item.quantity) || 1;
                if (product.stock_qty < quantity) {
                    throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock_qty}`);
                }

                const unitPrice = parseFloat(item.unit_price) || parseFloat(product.sell_price) || 0;
                const itemTotal = quantity * unitPrice;
                subtotal += itemTotal;

                validatedItems.push({
                    product_id: product.product_id,
                    sku: product.sku,
                    product_name: product.name,
                    quantity,
                    unit_price: unitPrice,
                    cost_price: product.buy_price || 0,
                    department: product.department,
                    item_total: itemTotal
                });
            }

            // Calculate totals (0% tax)
            const grandTotal = subtotal;

            // Determine payment details based on transaction type
            let paidAmount = parseFloat(amount_paid) || 0;
            let balanceAmount = 0;
            let saleType = 'normal';

            if (transaction_type === 'add_to_balance') {
                // Add to customer's balance (no immediate payment)
                balanceAmount = grandTotal;
                saleType = 'balance_sale';
            } else {
                // Immediate payment
                if (paidAmount < grandTotal) {
                    balanceAmount = grandTotal - paidAmount;
                }
            }

            // 3. Create sale record
            const saleId = this.generateSaleId();
            const saleQuery = `
                INSERT INTO ${TABLE.sales} (
                    sale_id, date, department, served_by, customer_id,
                    customer_type, payment_mode, total, paid, balance,
                    discount_amount, status, sale_type, transaction_notes,
                    created_at
                ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
                RETURNING *
            `;

            const customerType = customer_id ? 'Learner' : 'Walk-in';
            
            const saleResult = await client.query(saleQuery, [
                saleId,
                department,
                userName || 'Unknown',
                customer_id || null,
                customerType,
                payment_mode,
                grandTotal,
                paidAmount,
                balanceAmount,
                0, // discount_amount
                'completed',
                saleType,
                notes || ''
            ]);

            const sale = saleResult.rows[0];

            // 4. Create sale items and update ${TABLE.products}
            for (const item of validatedItems) {
                // Create sale item
                await client.query(`
                    INSERT INTO ${TABLE.sale_items} (
                        sale_item_id, sale_id, product_id, sku, product_name,
                        qty, unit_price, cost_price, department, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                `, [
                    `ITEM-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                    saleId,
                    item.product_id,
                    item.sku,
                    item.product_name,
                    item.quantity,
                    item.unit_price,
                    item.cost_price,
                    item.department
                ]);

                // Update ${TABLE.products} stock
                await client.query(`
                    UPDATE ${TABLE.products} 
                    SET stock_qty = stock_qty - $1, updated_at = NOW()
                    WHERE product_id = $2
                `, [item.quantity, item.product_id]);
            }

            // 5. Update ${TABLE.customers} balance if learner
            if (customer_id) {
                if (transaction_type === 'add_to_balance') {
                    // Increase balance (adds to debt)
                    await client.query(`
                        UPDATE ${TABLE.customers} 
                        SET 
                            total_items_cost = total_items_cost + $1,
                            balance = balance + $1,
                            updated_at = NOW()
                        WHERE customer_id = $2
                    `, [grandTotal, customer_id]);
                } else if (paidAmount > 0) {
                    // Reduce balance (payment made)
                    await client.query(`
                        UPDATE ${TABLE.customers} 
                        SET 
                            amount_paid = amount_paid + $1,
                            balance = GREATEST(0, balance - $1),
                            updated_at = NOW()
                        WHERE customer_id = $2
                    `, [paidAmount, customer_id]);
                }

                // Record payment if immediate payment
                if (paidAmount > 0) {
                    await client.query(`
                        INSERT INTO ${TABLE.payments} (
                            payment_id, sale_id, customer_id, method, reference,
                            amount, date, status, notes, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'completed', $7, NOW())
                    `, [
                        `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        saleId,
                        customer_id,
                        payment_mode,
                        `PAY-${Date.now()}`,
                        paidAmount,
                        notes || 'POS Sale Payment'
                    ]);
                }
            }

            await client.query('COMMIT');
            return sale; // Add this return statement
            
        } catch (error) {  // Add this catch block
            await client.query('ROLLBACK');
            console.error('Error processing sale:', error);
            throw error;
        } finally {  // Add this finally block
            client.release();
        }
    }

    // =============== QUICK LOOKUP ===============

    async quickLookup(identifier, userDepartment = null) {
        try {
            // Try by SKU first
            let product = await this.findProductBySku(identifier);
            
            // If not found, try by product ID
            if (!product) {
                product = await this.findProductById(identifier);
            }

            if (!product) {
                return null;
            }

            // Check department access
            if (userDepartment && userDepartment !== 'admin' && product.department !== userDepartment) {
                return null;
            }

            return product;
        } catch (error) {
            console.error('Error in quick lookup:', error);
            throw error;
        }
    }

    // =============== M-PESA SIMULATION ===============

    async simulateMpesaPayment(amount, phone, saleId) {
        try {
            // Simulate M-Pesa STK push response
            const checkoutRequestID = `ws_CO_${Date.now()}`;
            
            return {
                success: true,
                checkoutRequestID,
                merchantRequestID: `MARQ-${Date.now()}`,
                responseCode: '0',
                responseDescription: 'Success. Request accepted for processing',
                customerMessage: 'Success. Request accepted for processing',
                transactionDate: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error simulating M-Pesa:', error);
            throw error;
        }
    }

    // =============== STOCK MANAGEMENT ===============

    async updateProductStock(productId, quantityChange) {
        try {
            const result = await db.query(`
                UPDATE ${TABLE.products} 
                SET stock_qty = GREATEST(0, stock_qty + $1), updated_at = NOW()
                WHERE product_id = $2
                RETURNING product_id, sku, name, stock_qty
            `, [quantityChange, productId]);

            return result.rows[0] || null;
        } catch (error) {
            console.error('Error updating product stock:', error);
            throw error;
        }
    }

    // =============== DEPARTMENT VALIDATION ===============

    validateDepartmentAccess(userRole, requestedDepartment) {
        if (userRole === 'admin') {
            return true;
        }

        const userDept = userRole.toLowerCase();
        const reqDept = requestedDepartment.toLowerCase();
        
        return userDept === reqDept;
    }

    getUserDepartment(role) {
        if (role === 'admin') {
            return 'admin';
        }
        return role; // In Format C, role IS the department name
    }
}

module.exports = new PosService();