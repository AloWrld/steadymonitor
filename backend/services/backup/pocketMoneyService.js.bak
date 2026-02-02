// backend/services/pocketMoneyService.js
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const TABLE = require('../config/table-map');
class PocketMoneyService {
    // =============== POCKET MONEY VALIDATION ===============

    async validatePocketMoneyTransaction(learnerId, items, department) {
        try {
            // 1. Get learner details
            const learnerResult = await db.query(
                'SELECT * FROM ${TABLE.customers} WHERE customer_id = $1',
                [learnerId]
            );

            if (learnerResult.rows.length === 0) {
                return { valid: false, message: 'Learner not found' };
            }

            const learner = learnerResult.rows[0];

            // 2. Validate boarding status
            if (learner.boarding_status !== 'Boarding') {
                return { 
                    valid: false, 
                    message: 'Pocket money transactions are only available for boarders' 
                };
            }

            // 3. Validate pocket money enabled
            if (!learner.pocket_money_enabled) {
                return { 
                    valid: false, 
                    message: 'This learner does not have pocket money enabled' 
                };
            }

            // 4. Validate items
            const allowedDepartments = ['Stationery', 'Uniform'];
            let totalAmount = 0;
            const validatedItems = [];

            for (const item of items) {
                const productResult = await db.query(
                    'SELECT * FROM ${TABLE.products} WHERE product_id = $1',
                    [item.product_id]
                );

                if (productResult.rows.length === 0) {
                    return { 
                        valid: false, 
                        message: `Product not found: ${item.product_id}` 
                    };
                }

                const product = productResult.rows[0];

                // Check department restriction for pocket money
                if (!allowedDepartments.includes(product.department)) {
                    return { 
                        valid: false, 
                        message: `Pocket money cannot be used for ${product.department} items. Allowed: ${allowedDepartments.join(', ')}` 
                    };
                }

                // Check stock
                const quantity = parseInt(item.quantity) || 1;
                if (product.stock_qty < quantity) {
                    return { 
                        valid: false, 
                        message: `Insufficient stock for ${product.name}. Available: ${product.stock_qty}` 
                    };
                }

                const unitPrice = parseFloat(item.unit_price) || parseFloat(product.sell_price) || 0;
                const itemTotal = quantity * unitPrice;
                
                totalAmount += itemTotal;
                
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

            // 5. Check pocket money balance
            const pocketMoneyBalance = parseFloat(learner.pocket_money_balance) || 0;
            if (pocketMoneyBalance < totalAmount) {
                return {
                    valid: false,
                    message: `Insufficient pocket money balance. Available: KES ${pocketMoneyBalance}, Required: KES ${totalAmount}`
                };
            }

            return {
                valid: true,
                learner: learner,
                validatedItems: validatedItems,
                totalAmount: totalAmount,
                pocketMoneyBalance: pocketMoneyBalance,
                newBalance: pocketMoneyBalance - totalAmount
            };

        } catch (error) {
            console.error('Error validating pocket money transaction:', error);
            throw error;
        }
    }

    // =============== POCKET MONEY TRANSACTION ===============

    async processPocketMoneyTransaction(transactionData, userInfo) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const {
                learner_id,
                items,
                department,
                notes = 'Pocket money purchase'
            } = transactionData;

            const { userName, userRole } = userInfo;

            // 1. Validate transaction
            const validation = await this.validatePocketMoneyTransaction(learner_id, items, department);
            if (!validation.valid) {
                throw new Error(validation.message);
            }

            const { learner, validatedItems, totalAmount, pocketMoneyBalance, newBalance } = validation;

            // 2. Create pocket money sale record
            const saleId = uuidv4();
            const saleQuery = `
                INSERT INTO ${TABLE.sales} (
                    sale_id, date, department, served_by, customer_id,
                    customer_type, payment_mode, total, paid, balance,
                    status, sale_type, transaction_notes, program_type,
                    created_at
                ) VALUES ($1, NOW(), $2, $3, $4, 'pocket_money',
                          'pocket_money', $5, $5, 0, 'completed',
                          'pocket_money', $6, 'pocket_money', NOW())
                RETURNING *
            `;

            const saleResult = await client.query(saleQuery, [
                saleId,
                department || validatedItems[0]?.department || 'Stationery',
                userName || 'Unknown',
                learner_id,
                totalAmount,
                `${notes} (Pocket Money)`
            ]);

            const sale = saleResult.rows[0];

            // 3. Create sale items and update ${TABLE.products}
            for (const item of validatedItems) {
                // Create sale item
                await client.query(`
                    INSERT INTO ${TABLE.sale_items} (
                        sale_item_id, sale_id, product_id, sku, product_name,
                        qty, unit_price, cost_price, department, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                `, [
                    uuidv4(),
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

                // Record in allocation_history (as disbursement)
                await client.query(`
                    INSERT INTO ${TABLE.allocation_history} (
                        history_id, customer_id, customer_name, customer_class,
                        product_id, sku, product_name, quantity, unit_price,
                        program_type, frequency, given_date, given_by, notes,
                        is_allocation, is_pocket_money, parent_allocation_id,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'once',
                              NOW(), $11, $12, FALSE, TRUE, $13, NOW())
                `, [
                    uuidv4(),
                    learner_id,
                    learner.name,
                    learner.class || '',
                    item.product_id,
                    item.sku,
                    item.product_name,
                    item.quantity,
                    item.unit_price,
                    'pocket_money',
                    userName || 'Unknown',
                    `${notes} (Pocket Money)`,
                    saleId
                ]);
            }

            // 4. Update ${TABLE.customers}'s pocket money balance and financials
            const currentTotal = parseFloat(learner.total_items_cost) || 0;
            const currentBalance = parseFloat(learner.balance) || 0;
            
            await client.query(`
                UPDATE ${TABLE.customers} 
                SET 
                    pocket_money_balance = $1,
                    total_items_cost = $2,
                    balance = $3,
                    updated_at = NOW()
                WHERE customer_id = $4
            `, [
                newBalance,  // Deduct from ${TABLE.pocket_money} money
                currentTotal + totalAmount,  // Increase total items cost
                currentBalance + totalAmount,  // Increase overall balance (adds to debt)
                learner_id
            ]);

            // 5. Record payment (pocket money deduction)
            await client.query(`
                INSERT INTO ${TABLE.payments} (
                    payment_id, sale_id, customer_id, method, reference,
                    amount, date, status, notes, created_at
                ) VALUES ($1, $2, $3, 'pocket_money', $4, $5, NOW(),
                          'completed', $6, NOW())
            `, [
                uuidv4(),
                saleId,
                learner_id,
                `PM-${Date.now()}`,
                totalAmount,
                'Pocket money deduction'
            ]);

            await client.query('COMMIT');

            return {
                success: true,
                sale_id: saleId,
                sale: sale,
                learner: {
                    id: learner_id,
                    name: learner.name,
                    class: learner.class,
                    previous_pocket_money: pocketMoneyBalance,
                    new_pocket_money: newBalance,
                    previous_balance: currentBalance,
                    new_balance: currentBalance + totalAmount
                },
                items: validatedItems,
                totals: {
                    total: totalAmount,
                    pocket_money_deducted: totalAmount
                },
                transaction_type: 'pocket_money'
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error processing pocket money transaction:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // =============== POCKET MONEY MANAGEMENT ===============

    async topUpPocketMoney(learnerId, amount, notes, userInfo) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const { userName } = userInfo;

            // 1. Get learner details
            const learnerResult = await client.query(
                'SELECT * FROM ${TABLE.customers} WHERE customer_id = $1 FOR UPDATE',
                [learnerId]
            );

            if (learnerResult.rows.length === 0) {
                throw new Error('Learner not found');
            }

            const learner = learnerResult.rows[0];

            // 2. Validate boarding status
            if (learner.boarding_status !== 'Boarding') {
                throw new Error('Pocket money can only be topped up for boarders');
            }

            // 3. Update ${TABLE.pocket_money} money balance
            const currentBalance = parseFloat(learner.pocket_money_balance) || 0;
            const newBalance = currentBalance + parseFloat(amount);

            await client.query(`
                UPDATE ${TABLE.customers} 
                SET pocket_money_balance = $1, updated_at = NOW()
                WHERE customer_id = $2
            `, [newBalance, learnerId]);

            // 4. Record top-up transaction
            const transactionId = uuidv4();
            await client.query(`
                INSERT INTO ${TABLE.allocation_history} (
                    history_id, customer_id, customer_name, customer_class,
                    product_id, sku, product_name, quantity, unit_price,
                    program_type, frequency, given_date, given_by, notes,
                    is_allocation, is_pocket_money, created_at
                ) VALUES ($1, $2, $3, $4, NULL, 'TOPUP', 'Pocket Money Top-up',
                          1, $5, 'pocket_money', 'once', NOW(), $6, $7,
                          FALSE, TRUE, NOW())
            `, [
                transactionId,
                learnerId,
                learner.name,
                learner.class || '',
                amount,
                userName || 'Admin',
                notes || 'Pocket money top-up'
            ]);

            await client.query('COMMIT');

            return {
                success: true,
                transaction_id: transactionId,
                learner: {
                    id: learnerId,
                    name: learner.name,
                    previous_balance: currentBalance,
                    new_balance: newBalance,
                    amount_added: amount
                },
                notes: notes || 'Pocket money top-up'
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error topping up pocket money:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async deductPocketMoney(learnerId, amount, reason, userInfo) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const { userName } = userInfo;

            // 1. Get learner details
            const learnerResult = await client.query(
                'SELECT * FROM ${TABLE.customers} WHERE customer_id = $1 FOR UPDATE',
                [learnerId]
            );

            if (learnerResult.rows.length === 0) {
                throw new Error('Learner not found');
            }

            const learner = learnerResult.rows[0];

            // 2. Check sufficient balance
            const currentBalance = parseFloat(learner.pocket_money_balance) || 0;
            if (currentBalance < amount) {
                throw new Error(`Insufficient pocket money balance. Available: KES ${currentBalance}, Required: KES ${amount}`);
            }

            // 3. Update ${TABLE.pocket_money_balance}
            const newBalance = currentBalance - amount;

            await client.query(`
                UPDATE ${TABLE.customers} 
                SET pocket_money_balance = $1, updated_at = NOW()
                WHERE customer_id = $2
            `, [newBalance, learnerId]);

            // 4. Record deduction
            const transactionId = uuidv4();
            await client.query(`
                INSERT INTO ${TABLE.allocation_history} (
                    history_id, customer_id, customer_name, customer_class,
                    product_id, sku, product_name, quantity, unit_price,
                    program_type, frequency, given_date, given_by, notes,
                    is_allocation, is_pocket_money, created_at
                ) VALUES ($1, $2, $3, $4, NULL, 'DEDUCT', 'Pocket Money Deduction',
                          1, $5, 'pocket_money', 'once', NOW(), $6, $7,
                          FALSE, TRUE, NOW())
            `, [
                transactionId,
                learnerId,
                learner.name,
                learner.class || '',
                amount,
                userName || 'Admin',
                `${reason} (Pocket money deduction)`
            ]);

            await client.query('COMMIT');

            return {
                success: true,
                transaction_id: transactionId,
                learner: {
                    id: learnerId,
                    name: learner.name,
                    previous_balance: currentBalance,
                    new_balance: newBalance,
                    amount_deducted: amount
                },
                reason: reason
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error deducting pocket money:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // =============== POCKET MONEY QUERIES ===============

    async getLearnerPocketMoneyHistory(learnerId, filters = {}) {
        try {
            let query = `
                SELECT 
                    ah.history_id,
                    ah.customer_id,
                    ah.customer_name,
                    ah.customer_class,
                    ah.product_id,
                    ah.sku,
                    ah.product_name,
                    ah.quantity,
                    ah.unit_price,
                    ah.program_type,
                    ah.given_date,
                    ah.given_by,
                    ah.notes,
                    ah.is_pocket_money,
                    p.department,
                    p.category
                FROM ${TABLE.allocation_history} ah
                LEFT JOIN ${TABLE.products} p ON ah.product_id = p.product_id
                WHERE ah.customer_id = $1 AND ah.is_pocket_money = TRUE
            `;

            const params = [learnerId];
            let paramCount = 1;

            if (filters.start_date) {
                paramCount++;
                query += ` AND ah.given_date >= $${paramCount}`;
                params.push(filters.start_date);
            }

            if (filters.end_date) {
                paramCount++;
                query += ` AND ah.given_date <= $${paramCount}`;
                params.push(filters.end_date);
            }

            if (filters.transaction_type === 'purchase') {
                query += ` AND ah.product_id IS NOT NULL`;
            } else if (filters.transaction_type === 'topup') {
                query += ` AND ah.sku = 'TOPUP'`;
            } else if (filters.transaction_type === 'deduction') {
                query += ` AND ah.sku = 'DEDUCT'`;
            }

            query += ` ORDER BY ah.given_date DESC LIMIT 100`;

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting pocket money history:', error);
            throw error;
        }
    }

    async getPocketMoneySummary(filters = {}) {
        try {
            let query = `
                SELECT 
                    c.customer_id,
                    c.name,
                    c.class,
                    c.boarding_status,
                    c.pocket_money_enabled,
                    c.pocket_money_balance,
                    COUNT(ah.history_id) as transaction_count,
                    COALESCE(SUM(CASE WHEN ah.product_id IS NOT NULL THEN ah.quantity * ah.unit_price ELSE 0 END), 0) as total_spent,
                    COALESCE(SUM(CASE WHEN ah.sku = 'TOPUP' THEN ah.unit_price ELSE 0 END), 0) as total_topups,
                    COALESCE(SUM(CASE WHEN ah.sku = 'DEDUCT' THEN ah.unit_price ELSE 0 END), 0) as total_deductions,
                    MAX(ah.given_date) as last_transaction_date
                FROM ${TABLE.customers} c
                LEFT JOIN ${TABLE.allocation_history} ah ON c.customer_id = ah.customer_id 
                    AND ah.is_pocket_money = TRUE
                WHERE c.boarding_status = 'Boarding'
                  AND c.pocket_money_enabled = TRUE
            `;

            const params = [];
            let paramCount = 0;

            if (filters.class_name) {
                paramCount++;
                query += ` AND c.class = $${paramCount}`;
                params.push(filters.class_name);
            }

            if (filters.min_balance) {
                paramCount++;
                query += ` AND c.pocket_money_balance >= $${paramCount}`;
                params.push(parseFloat(filters.min_balance));
            }

            if (filters.max_balance) {
                paramCount++;
                query += ` AND c.pocket_money_balance <= $${paramCount}`;
                params.push(parseFloat(filters.max_balance));
            }

            query += ` GROUP BY c.customer_id, c.name, c.class, c.boarding_status, 
                              c.pocket_money_enabled, c.pocket_money_balance
                      ORDER BY c.class, c.name`;

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting pocket money summary:', error);
            throw error;
        }
    }

    async getPocketMoneyStats() {
        try {
            // Get overall statistics
            const overallStats = await db.query(`
                SELECT 
                    COUNT(*) as total_boarders,
                    COUNT(CASE WHEN pocket_money_enabled = TRUE THEN 1 END) as pocket_money_enabled_count,
                    SUM(pocket_money_balance) as total_pocket_money_balance,
                    AVG(pocket_money_balance) as average_pocket_money_balance,
                    COUNT(CASE WHEN pocket_money_balance = 0 THEN 1 END) as zero_balance_count
                FROM ${TABLE.customers}
                WHERE boarding_status = 'Boarding'
            `);

            // Get class-wise summary
            const classSummary = await db.query(`
                SELECT 
                    class,
                    COUNT(*) as boarder_count,
                    COUNT(CASE WHEN pocket_money_enabled = TRUE THEN 1 END) as enabled_count,
                    SUM(pocket_money_balance) as total_balance,
                    AVG(pocket_money_balance) as average_balance
                FROM ${TABLE.customers}
                WHERE boarding_status = 'Boarding'
                  AND class IS NOT NULL
                GROUP BY class
                ORDER BY class
            `);

            // Get monthly spending
            const monthlySpending = await db.query(`
                SELECT 
                    DATE_TRUNC('month', ah.given_date) as month,
                    COUNT(*) as transaction_count,
                    SUM(ah.quantity * ah.unit_price) as total_spent,
                    COUNT(DISTINCT ah.customer_id) as unique_learners
                FROM ${TABLE.allocation_history} ah
                WHERE ah.is_pocket_money = TRUE
                  AND ah.product_id IS NOT NULL
                GROUP BY DATE_TRUNC('month', ah.given_date)
                ORDER BY month DESC
                LIMIT 12
            `);

            return {
                overall: overallStats.rows[0] || {},
                by_class: classSummary.rows,
                monthly_spending: monthlySpending.rows
            };
        } catch (error) {
            console.error('Error getting pocket money stats:', error);
            throw error;
        }
    }

    async enablePocketMoney(learnerId, userInfo) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const { userName } = userInfo;

            // 1. Get learner and validate boarding status
            const learnerResult = await client.query(
                'SELECT * FROM ${TABLE.customers} WHERE customer_id = $1 FOR UPDATE',
                [learnerId]
            );

            if (learnerResult.rows.length === 0) {
                throw new Error('Learner not found');
            }

            const learner = learnerResult.rows[0];

            if (learner.boarding_status !== 'Boarding') {
                throw new Error('Pocket money can only be enabled for boarders');
            }

            // 2. Enable pocket money
            await client.query(`
                UPDATE ${TABLE.customers} 
                SET pocket_money_enabled = TRUE, updated_at = NOW()
                WHERE customer_id = $1
            `, [learnerId]);

            // 3. Record activation
            await client.query(`
                INSERT INTO ${TABLE.allocation_history} (
                    history_id, customer_id, customer_name, customer_class,
                    product_id, sku, product_name, quantity, unit_price,
                    program_type, frequency, given_date, given_by, notes,
                    is_allocation, is_pocket_money, created_at
                ) VALUES ($1, $2, $3, $4, NULL, 'ACTIVATE', 'Pocket Money Activation',
                          1, 0, 'pocket_money', 'once', NOW(), $5, $6,
                          FALSE, TRUE, NOW())
            `, [
                uuidv4(),
                learnerId,
                learner.name,
                learner.class || '',
                userName || 'Admin',
                'Pocket money enabled for learner'
            ]);

            await client.query('COMMIT');

            return {
                success: true,
                learner: {
                    id: learnerId,
                    name: learner.name,
                    class: learner.class,
                    boarding_status: learner.boarding_status,
                    pocket_money_enabled: true
                }
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error enabling pocket money:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async disablePocketMoney(learnerId, reason, userInfo) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const { userName } = userInfo;

            // 1. Get learner
            const learnerResult = await client.query(
                'SELECT * FROM ${TABLE.customers} WHERE customer_id = $1 FOR UPDATE',
                [learnerId]
            );

            if (learnerResult.rows.length === 0) {
                throw new Error('Learner not found');
            }

            const learner = learnerResult.rows[0];

            // 2. Disable pocket money
            await client.query(`
                UPDATE ${TABLE.customers} 
                SET pocket_money_enabled = FALSE, updated_at = NOW()
                WHERE customer_id = $1
            `, [learnerId]);

            // 3. Record deactivation
            await client.query(`
                INSERT INTO ${TABLE.allocation_history} (
                    history_id, customer_id, customer_name, customer_class,
                    product_id, sku, product_name, quantity, unit_price,
                    program_type, frequency, given_date, given_by, notes,
                    is_allocation, is_pocket_money, created_at
                ) VALUES ($1, $2, $3, $4, NULL, 'DEACTIVATE', 'Pocket Money Deactivation',
                          1, 0, 'pocket_money', 'once', NOW(), $5, $6,
                          FALSE, TRUE, NOW())
            `, [
                uuidv4(),
                learnerId,
                learner.name,
                learner.class || '',
                userName || 'Admin',
                reason || 'Pocket money disabled'
            ]);

            await client.query('COMMIT');

            return {
                success: true,
                learner: {
                    id: learnerId,
                    name: learner.name,
                    class: learner.class,
                    pocket_money_enabled: false,
                    remaining_balance: learner.pocket_money_balance || 0
                },
                reason: reason
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error disabling pocket money:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new PocketMoneyService();