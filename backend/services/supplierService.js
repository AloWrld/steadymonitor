// backend/services/supplierService.js
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const TABLE = require('../config/table-map');
class SupplierService {
    // ==================== SUPPLIER MANAGEMENT ====================
    
    /**
     * Get all active suppliers
     */
    async getAllSuppliers() {
        try {
            const result = await db.query(
                'SELECT * FROM ${TABLE.suppliers} WHERE active = true ORDER BY name'
            );
            return result.rows;
        } catch (error) {
            console.error('Get suppliers error:', error);
            throw error;
        }
    }

    /**
     * Get supplier by ID
     */
    async getSupplierById(supplierId) {
        try {
            const result = await db.query(
                'SELECT * FROM ${TABLE.suppliers} WHERE supplier_id = $1 AND active = true',
                [supplierId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Get supplier by ID error:', error);
            throw error;
        }
    }

    /**
     * Create new supplier
     */
    async createSupplier(supplierData) {
        try {
            const { name, contact, email, products_supplied, notes } = supplierData;
            
            if (!name) {
                throw new Error('Supplier name is required');
            }

            // Check if supplier already exists
            const existing = await db.query(
                'SELECT * FROM ${TABLE.suppliers} WHERE LOWER(name) = LOWER($1) AND active = true',
                [name]
            );

            if (existing.rows.length > 0) {
                return existing.rows[0]; // Return existing supplier
            }

            const supplierId = uuidv4();
            const now = new Date().toISOString();

            const result = await db.query(
                `INSERT INTO ${TABLE.suppliers} (
                    supplier_id, name, contact, email, products_supplied, 
                    balance, notes, created_at, updated_at, active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *`,
                [
                    supplierId,
                    name,
                    contact || '',
                    email || '',
                    products_supplied || '',
                    0, // Initial balance
                    notes || '',
                    now,
                    now,
                    true
                ]
            );

            return result.rows[0];
        } catch (error) {
            console.error('Create supplier error:', error);
            throw error;
        }
    }

    /**
     * Update ${TABLE.suppliers}
     */
    async updateSupplier(supplierId, updateData) {
        try {
            const supplier = await this.getSupplierById(supplierId);
            if (!supplier) {
                throw new Error('Supplier not found');
            }

            const fields = [];
            const values = [];
            let paramCount = 1;

            // Build dynamic update query
            for (const [key, value] of Object.entries(updateData)) {
                if (key !== 'supplier_id' && key !== 'balance' && key !== 'created_at') {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            }

            if (fields.length === 0) {
                return supplier; // Nothing to update
            }

            // Add updated_at timestamp
            fields.push(`updated_at = $${paramCount}`);
            values.push(new Date().toISOString());
            paramCount++;

            // Add WHERE clause
            values.push(supplierId);

            const query = `
                UPDATE ${TABLE.suppliers} 
                SET ${fields.join(', ')} 
                WHERE supplier_id = $${paramCount} AND active = true 
                RETURNING *
            `;

            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Update ${TABLE.suppliers} error:', error);
            throw error;
        }
    }

    /**
     * Archive supplier (soft delete)
     */
    async deleteSupplier(supplierId) {
        try {
            const result = await db.query(
                `UPDATE ${TABLE.suppliers} 
                 SET active = false, updated_at = $1 
                 WHERE supplier_id = $2 AND active = true 
                 RETURNING *`,
                [new Date().toISOString(), supplierId]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Supplier not found or already deleted');
            }
            
            return result.rows[0];
        } catch (error) {
            console.error('Delete supplier error:', error);
            throw error;
        }
    }

    /**
     * Search suppliers by name
     */
    async searchSuppliers(query) {
        try {
            const result = await db.query(
                `SELECT * FROM ${TABLE.suppliers} 
                 WHERE active = true 
                 AND (LOWER(name) LIKE LOWER($1) OR LOWER(contact) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1))
                 ORDER BY name`,
                [`%${query}%`]
            );
            return result.rows;
        } catch (error) {
            console.error('Search suppliers error:', error);
            throw error;
        }
    }

    // ==================== RESTOCK MANAGEMENT ====================
    
    /**
     * Process restock - creates restock record, updates products, creates credit
     */
    async processRestock(restockData, items, userInfo) {
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            const { supplier_id, misc_expenses = 0 } = restockData;
            const recorded_by = userInfo.userName || 'System';
            
            // 1. Verify supplier exists
            const supplier = await client.query(
                'SELECT * FROM ${TABLE.suppliers} WHERE supplier_id = $1 AND active = true',
                [supplier_id]
            );
            
            if (supplier.rows.length === 0) {
                throw new Error('Supplier not found');
            }
            
            let total_cost = 0;
            let total_expected_revenue = 0;
            
            // 2. Process each item
            for (const item of items) {
                const { product_id, quantity, buy_price, sell_price, name, department, reorder_level } = item;
                
                if (!product_id || !quantity || !buy_price || !sell_price) {
                    throw new Error('Each item must have product_id, quantity, buy_price, and sell_price');
                }
                
                const itemCost = buy_price * quantity;
                const itemRevenue = sell_price * quantity;
                total_cost += itemCost;
                total_expected_revenue += itemRevenue;
                
                // 3. Check if product exists
                const existingProduct = await client.query(
                    'SELECT * FROM ${TABLE.products} WHERE product_id = $1',
                    [product_id]
                );
                
                if (existingProduct.rows.length > 0) {
                    // Update existing product
                    await client.query(
                        `UPDATE ${TABLE.products} 
                         SET buy_price = $1, sell_price = $2, stock_qty = stock_qty + $3, 
                             updated_at = $4, supplier_id = $5
                         WHERE product_id = $6`,
                        [
                            buy_price,
                            sell_price,
                            quantity,
                            new Date().toISOString(),
                            supplier_id,
                            product_id
                        ]
                    );
                } else {
                    // Create new product
                    if (!name) {
                        throw new Error('New products require a name');
                    }
                    
                    await client.query(
                        `INSERT INTO ${TABLE.products} (
                            product_id, name, department, buy_price, sell_price, 
                            stock_qty, reorder_level, supplier_id, created_at, updated_at, active
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                        [
                            product_id,
                            name,
                            department || 'General',
                            buy_price,
                            sell_price,
                            quantity,
                            reorder_level || 10,
                            supplier_id,
                            new Date().toISOString(),
                            new Date().toISOString(),
                            true
                        ]
                    );
                }
            }
            
            // Add misc expenses to total cost
            total_cost += parseFloat(misc_expenses) || 0;
            const expected_profit = total_expected_revenue - total_cost;
            
            // 4. Create restock record
            const restock_id = uuidv4();
            const restockResult = await client.query(
                `INSERT INTO ${TABLE.restocks} (
                    restock_id, supplier_id, date, total_cost, expected_profit, 
                    misc_expenses, recorded_by, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *`,
                [
                    restock_id,
                    supplier_id,
                    new Date().toISOString(),
                    total_cost,
                    expected_profit,
                    misc_expenses || 0,
                    recorded_by,
                    'pending_payment'
                ]
            );
            
            // 5. Create supplier credit entry
            const credit_id = uuidv4();
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30); // 30 days from now
            
            await client.query(
                `INSERT INTO ${TABLE.supplier_credits} (
                    credit_id, supplier_id, restock_id, amount, original_amount,
                    date_created, due_date, status, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    credit_id,
                    supplier_id,
                    restock_id,
                    total_cost,
                    total_cost,
                    new Date().toISOString(),
                    dueDate.toISOString(),
                    'unpaid',
                    `Restock: ${items.length} items`
                ]
            );
            
            // 6. Update ${TABLE.suppliers} balance
            await client.query(
                'UPDATE ${TABLE.suppliers} SET balance = balance + $1, updated_at = $2 WHERE supplier_id = $3',
                [total_cost, new Date().toISOString(), supplier_id]
            );
            
            // 7. Get updated supplier info
            const updatedSupplier = await client.query(
                'SELECT * FROM ${TABLE.suppliers} WHERE supplier_id = $1',
                [supplier_id]
            );
            
            await client.query('COMMIT');
            
            return {
                restock: restockResult.rows[0],
                credit_entry: {
                    credit_id,
                    amount: total_cost,
                    due_date: dueDate.toISOString(),
                    status: 'unpaid'
                },
                supplier: updatedSupplier.rows[0],
                items_count: items.length,
                total_cost,
                expected_profit
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Process restock error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get all restocks with optional filters
     */
    async getRestocks(filters = {}) {
        try {
            let query = 'SELECT * FROM ${TABLE.restocks} WHERE 1=1';
            const values = [];
            let paramCount = 1;
            
            if (filters.supplier_id) {
                query += ` AND supplier_id = $${paramCount}`;
                values.push(filters.supplier_id);
                paramCount++;
            }
            
            if (filters.status) {
                query += ` AND status = $${paramCount}`;
                values.push(filters.status);
                paramCount++;
            }
            
            if (filters.start_date) {
                query += ` AND date >= $${paramCount}`;
                values.push(filters.start_date);
                paramCount++;
            }
            
            if (filters.end_date) {
                query += ` AND date <= $${paramCount}`;
                values.push(filters.end_date);
                paramCount++;
            }
            
            query += ' ORDER BY date DESC';
            
            const result = await db.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('Get restocks error:', error);
            throw error;
        }
    }

    /**
     * Get restocks for specific supplier
     */
    async getSupplierRestocks(supplierId) {
        try {
            const result = await db.query(
                'SELECT * FROM ${TABLE.restocks} WHERE supplier_id = $1 ORDER BY date DESC',
                [supplierId]
            );
            return result.rows;
        } catch (error) {
            console.error('Get supplier restocks error:', error);
            throw error;
        }
    }

    // ==================== CREDIT & PAYMENT MANAGEMENT ====================
    
    /**
     * Record supplier payment (simple balance reduction)
     */
    async recordSupplierPayment(paymentData, userInfo) {
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            const {
                supplier_id,
                amount,
                payment_method = 'cash',
                reference = '',
                notes = ''
            } = paymentData;
            
            const recorded_by = userInfo.userName || 'System';
            
            // 1. Validate required fields
            if (!supplier_id || !amount || amount <= 0) {
                throw new Error('Supplier ID and positive payment amount are required');
            }
            
            // 2. Get supplier and validate
            const supplierResult = await client.query(
                'SELECT * FROM ${TABLE.suppliers} WHERE supplier_id = $1 AND active = true',
                [supplier_id]
            );
            
            if (supplierResult.rows.length === 0) {
                throw new Error('Supplier not found');
            }
            
            const supplier = supplierResult.rows[0];
            const currentBalance = parseFloat(supplier.balance) || 0;
            
            if (currentBalance <= 0) {
                throw new Error('Supplier has no outstanding balance');
            }
            
            const paymentAmount = parseFloat(amount);
            
            if (paymentAmount > currentBalance) {
                throw new Error(`Payment amount (${paymentAmount}) exceeds outstanding balance (${currentBalance})`);
            }
            
            // 3. Record payment
            const payment_id = uuidv4();
            const paymentResult = await client.query(
                `INSERT INTO ${TABLE.supplier_payments} (
                    payment_id, supplier_id, amount, payment_method, reference,
                    date, recorded_by, notes, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *`,
                [
                    payment_id,
                    supplier_id,
                    paymentAmount,
                    payment_method,
                    reference,
                    new Date().toISOString(),
                    recorded_by,
                    notes,
                    'completed'
                ]
            );
            
            // 4. Update ${TABLE.suppliers} balance (simple reduction)
            const newBalance = currentBalance - paymentAmount;
            await client.query(
                'UPDATE ${TABLE.suppliers} SET balance = $1, updated_at = $2 WHERE supplier_id = $3',
                [newBalance, new Date().toISOString(), supplier_id]
            );
            
            // 5. Update any fully paid credits (simple approach - mark oldest unpaid credits as paid)
            if (newBalance === 0) {
                // If balance is zero, mark all unpaid credits as paid
                await client.query(
                    `UPDATE ${TABLE.supplier_credits} 
                     SET status = 'paid', paid_date = $1, updated_at = $2 
                     WHERE supplier_id = $3 AND status = 'unpaid'`,
                    [new Date().toISOString(), new Date().toISOString(), supplier_id]
                );
                
                // Update corresponding restocks status
                await client.query(
                    `UPDATE ${TABLE.restocks} 
                     SET status = 'paid', updated_at = $1 
                     WHERE supplier_id = $2 AND status = 'pending_payment'`,
                    [new Date().toISOString(), supplier_id]
                );
            } else {
                // Simple proportional reduction of credit amounts
                const unpaidCredits = await client.query(
                    `SELECT * FROM ${TABLE.supplier_credits} 
                     WHERE supplier_id = $1 AND status = 'unpaid'
                     ORDER BY date_created`,
                    [supplier_id]
                );
                
                let remainingPayment = paymentAmount;
                
                for (const credit of unpaidCredits.rows) {
                    if (remainingPayment <= 0) break;
                    
                    const creditAmount = parseFloat(credit.amount);
                    const amountToReduce = Math.min(remainingPayment, creditAmount);
                    const newCreditAmount = creditAmount - amountToReduce;
                    
                    if (newCreditAmount > 0) {
                        await client.query(
                            'UPDATE ${TABLE.supplier_credits} SET amount = $1, updated_at = $2 WHERE credit_id = $3',
                            [newCreditAmount, new Date().toISOString(), credit.credit_id]
                        );
                    } else {
                        await client.query(
                            `UPDATE ${TABLE.supplier_credits} 
                             SET amount = 0, status = 'paid', paid_date = $1, updated_at = $2 
                             WHERE credit_id = $3`,
                            [new Date().toISOString(), new Date().toISOString(), credit.credit_id]
                        );
                        
                        // Update corresponding restock
                        if (credit.restock_id) {
                            await client.query(
                                'UPDATE ${TABLE.restocks} SET status = $1, updated_at = $2 WHERE restock_id = $3',
                                ['paid', new Date().toISOString(), credit.restock_id]
                            );
                        }
                    }
                    
                    remainingPayment -= amountToReduce;
                }
            }
            
            // 6. Get updated supplier
            const updatedSupplier = await client.query(
                'SELECT * FROM ${TABLE.suppliers} WHERE supplier_id = $1',
                [supplier_id]
            );
            
            await client.query('COMMIT');
            
            return {
                payment: paymentResult.rows[0],
                supplier: updatedSupplier.rows[0],
                previous_balance: currentBalance,
                new_balance: newBalance
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Record supplier payment error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get supplier credits
     */
    async getSupplierCredits(supplierId) {
        try {
            const result = await db.query(
                `SELECT * FROM ${TABLE.supplier_credits} 
                 WHERE supplier_id = $1 
                 ORDER BY date_created DESC`,
                [supplierId]
            );
            return result.rows;
        } catch (error) {
            console.error('Get supplier credits error:', error);
            throw error;
        }
    }

    /**
     * Get supplier balance and credit summary
     */
    async getSupplierBalance(supplierId) {
        try {
            // Get supplier info
            const supplier = await this.getSupplierById(supplierId);
            if (!supplier) {
                throw new Error('Supplier not found');
            }
            
            // Get unpaid credits
            const unpaidCredits = await db.query(
                `SELECT * FROM ${TABLE.supplier_credits} 
                 WHERE supplier_id = $1 AND status = 'unpaid'`,
                [supplierId]
            );
            
            // Get payment history
            const payments = await db.query(
                `SELECT * FROM ${TABLE.supplier_payments} 
                 WHERE supplier_id = $1 
                 ORDER BY date DESC`,
                [supplierId]
            );
            
            // Calculate credit summary
            const totalCredit = unpaidCredits.rows.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
            const totalPaid = payments.rows.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            
            // Check for overdue credits
            const now = new Date();
            const overdueCredits = unpaidCredits.rows.filter(credit => {
                if (!credit.due_date) return false;
                return new Date(credit.due_date) < now;
            });
            
            const totalOverdue = overdueCredits.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
            
            return {
                supplier,
                credit_summary: {
                    total_credit: totalCredit,
                    total_paid: totalPaid,
                    current_balance: parseFloat(supplier.balance) || 0,
                    unpaid_credits_count: unpaidCredits.rows.length,
                    overdue_credits_count: overdueCredits.length,
                    total_overdue: totalOverdue,
                    has_overdue: totalOverdue > 0
                },
                credits: unpaidCredits.rows,
                payments: payments.rows
            };
        } catch (error) {
            console.error('Get supplier balance error:', error);
            throw error;
        }
    }

    /**
     * Get all supplier transactions (credits + payments)
     */
    async getSupplierTransactions(supplierId) {
        try {
            // Get restocks
            const restocks = await this.getSupplierRestocks(supplierId);
            
            // Get payments
            const payments = await db.query(
                'SELECT * FROM ${TABLE.supplier_payments} WHERE supplier_id = $1 ORDER BY date DESC',
                [supplierId]
            );
            
            return {
                total_restocks: restocks.length,
                total_spent: restocks.reduce((sum, r) => sum + (parseFloat(r.total_cost) || 0), 0),
                restocks: restocks,
                payments: payments.rows
            };
        } catch (error) {
            console.error('Get supplier transactions error:', error);
            throw error;
        }
    }

    // ==================== REPORTS ====================
    
    /**
     * Get due credits report (overdue credits)
     */
    async getDueCreditsReport() {
        try {
            const now = new Date().toISOString();
            
            const result = await db.query(
                `SELECT 
                    s.supplier_id,
                    s.name as supplier_name,
                    s.contact,
                    s.email,
                    sc.credit_id,
                    sc.amount,
                    sc.original_amount,
                    sc.date_created,
                    sc.due_date,
                    sc.status,
                    DATEDIFF(sc.due_date::date, NOW()::date) as days_overdue
                 FROM ${TABLE.supplier_credits} sc
                 JOIN ${TABLE.suppliers} s ON sc.supplier_id = s.supplier_id
                 WHERE sc.status = 'unpaid' 
                 AND sc.due_date < $1
                 AND s.active = true
                 ORDER BY sc.due_date`,
                [now]
            );
            
            return result.rows;
        } catch (error) {
            console.error('Get due credits report error:', error);
            throw error;
        }
    }

    /**
     * Get low stock products from ${TABLE.suppliers}
     */
    async getLowStockSuppliers() {
        try {
            const result = await db.query(
                `SELECT 
                    s.supplier_id,
                    s.name as supplier_name,
                    s.contact,
                    s.email,
                    p.product_id,
                    p.name as product_name,
                    p.stock_qty,
                    p.reorder_level,
                    p.buy_price,
                    p.sell_price,
                    (p.reorder_level - p.stock_qty) as needed_qty
                 FROM ${TABLE.products} p
                 JOIN ${TABLE.suppliers} s ON p.supplier_id = s.supplier_id
                 WHERE p.stock_qty <= p.reorder_level
                 AND p.active = true
                 AND s.active = true
                 ORDER BY s.name, p.name`
            );
            
            return result.rows;
        } catch (error) {
            console.error('Get low stock suppliers error:', error);
            throw error;
        }
    }

    /**
     * Get supplier performance metrics
     */
    async getSupplierPerformance() {
        try {
            const result = await db.query(
                `SELECT 
                    s.supplier_id,
                    s.name,
                    s.contact,
                    s.email,
                    COUNT(r.restock_id) as total_restocks,
                    COALESCE(SUM(r.total_cost), 0) as total_spent,
                    COALESCE(SUM(r.expected_profit), 0) as total_expected_profit,
                    COALESCE(SUM(CASE WHEN r.status = 'pending_payment' THEN r.total_cost ELSE 0 END), 0) as pending_amount,
                    s.balance as current_balance,
                    COUNT(DISTINCT p.product_id) as products_supplied
                 FROM ${TABLE.suppliers} s
                 LEFT JOIN ${TABLE.restocks} r ON s.supplier_id = r.supplier_id
                 LEFT JOIN ${TABLE.products} p ON s.supplier_id = p.supplier_id
                 WHERE s.active = true
                 GROUP BY s.supplier_id, s.name, s.contact, s.email, s.balance
                 ORDER BY total_spent DESC`
            );
            
            return result.rows;
        } catch (error) {
            console.error('Get supplier performance error:', error);
            throw error;
        }
    }
}

module.exports = new SupplierService();