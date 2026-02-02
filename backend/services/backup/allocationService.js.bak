// backend/services/allocationService.js
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const TABLE = require('../config/table-map');
class AllocationService {
    // =============== ALLOCATION MANAGEMENT ===============

    async createAllocation(allocationData, userInfo) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const {
                learner_id,
                items,
                program_type, // 'A' or 'B'
                allocation_notes = '',
                is_batch = false,
                batch_class = ''
            } = allocationData;

            const { userName, userRole } = userInfo;

            // 1. Validate program type
            if (!['A', 'B'].includes(program_type)) {
                throw new Error('Program type must be A or B');
            }

            // 2. Get learner and validate program membership
            const learnerResult = await client.query(
                'SELECT * FROM ${TABLE.customers} WHERE customer_id = $1 FOR UPDATE',
                [learner_id]
            );

            if (learnerResult.rows.length === 0) {
                throw new Error('Learner not found');
            }

            const learner = learnerResult.rows[0];
            const programs = learner.program_membership ? learner.program_membership.split(',') : [];
            
            // Validate learner is in the specified program
            if (!programs.includes(program_type)) {
                throw new Error(`Learner is not enrolled in Program ${program_type}`);
            }

            // 3. Validate items and calculate total
            let totalAmount = 0;
            const validatedItems = [];

            for (const item of items) {
                const productResult = await client.query(
                    'SELECT * FROM ${TABLE.products} WHERE product_id = $1 FOR UPDATE',
                    [item.product_id]
                );

                if (productResult.rows.length === 0) {
                    throw new Error(`Product not found: ${item.product_id}`);
                }

                const product = productResult.rows[0];

                // Check stock
                const quantity = parseInt(item.quantity) || 1;
                if (product.stock_qty < quantity) {
                    throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock_qty}`);
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
                    total: itemTotal,
                    department: product.department,
                    cost_price: product.buy_price || 0
                });
            }

            // 4. Create allocation sale record
            const saleId = uuidv4();
            const saleQuery = `
                INSERT INTO ${TABLE.sales} (
                    sale_id, date, department, served_by, customer_id,
                    customer_type, payment_mode, total, paid, balance,
                    status, sale_type, program_type, transaction_notes,
                    created_at
                ) VALUES ($1, NOW(), 'Allocation', $2, $3, 'allocation',
                          'allocation', $4, 0, $4, 'completed', 'allocation',
                          $5, $6, NOW())
                RETURNING *
            `;

            const saleResult = await client.query(saleQuery, [
                saleId,
                userName || 'Admin',
                learner_id,
                totalAmount,
                program_type,
                `${allocation_notes} (Program ${program_type} Allocation${is_batch ? ' - Batch' : ''})`
            ]);

            const sale = saleResult.rows[0];

            // 5. Create sale items and update ${TABLE.products}
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
                        is_allocation, parent_allocation_id, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'once',
                              NOW(), $11, $12, TRUE, $13, NOW())
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
                    program_type,
                    userName || 'Admin',
                    `Program ${program_type} Allocation`,
                    saleId
                ]);
            }

            // 6. Update ${TABLE.customers}'s financials
            const currentTotal = parseFloat(learner.total_items_cost) || 0;
            const currentBalance = parseFloat(learner.balance) || 0;
            
            await client.query(`
                UPDATE ${TABLE.customers} 
                SET 
                    total_items_cost = $1,
                    balance = $2,
                    ${program_type === 'A' ? 'program_a_total = program_a_total + $3, program_a_balance = program_a_balance + $3' : 'program_b_total = program_b_total + $3, program_b_balance = program_b_balance + $3'},
                    updated_at = NOW()
                WHERE customer_id = $4
            `, [
                currentTotal + totalAmount,
                currentBalance + totalAmount,
                totalAmount,
                learner_id
            ]);

            // 7. Create batch record if batch allocation
            let batchId = null;
            if (is_batch && batch_class) {
                const batchResult = await client.query(`
                    INSERT INTO batches (
                        batch_id, batch_name, class, program_type, total_items,
                        total_value, status, operation_type, target_class,
                        created_by, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, 'processed', 'allocation',
                              $7, $8, NOW())
                    RETURNING batch_id
                `, [
                    uuidv4(),
                    `Program ${program_type} Allocation - ${batch_class}`,
                    batch_class,
                    program_type,
                    validatedItems.length,
                    totalAmount,
                    batch_class,
                    userName || 'Admin'
                ]);

                batchId = batchResult.rows[0].batch_id;
            }

            await client.query('COMMIT');

            return {
                success: true,
                sale_id: saleId,
                batch_id: batchId,
                learner: {
                    id: learner_id,
                    name: learner.name,
                    class: learner.class,
                    previous_balance: currentBalance,
                    new_balance: currentBalance + totalAmount,
                    program: program_type
                },
                total: totalAmount,
                items: validatedItems,
                is_batch: is_batch || false,
                batch_class: batch_class || ''
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating allocation:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async batchAllocateToClass(batchData, userInfo) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const {
                class_name,
                program_type,
                items,
                allocation_notes = '',
                exclude_learner_ids = []
            } = batchData;

            const { userName } = userInfo;

            // 1. Get all learners in class who are in the program
            const learnersResult = await client.query(`
                SELECT customer_id, name, class, program_membership,
                       total_items_cost, balance
                FROM ${TABLE.customers} 
                WHERE class = $1 
                  AND program_membership LIKE $2
                  AND customer_id != ALL($3)
            `, [
                class_name,
                `%${program_type}%`,
                exclude_learner_ids || []
            ]);

            const learners = learnersResult.rows;
            if (learners.length === 0) {
                throw new Error(`No learners found in class ${class_name} enrolled in Program ${program_type}`);
            }

            // 2. Validate all items have sufficient stock
            for (const item of items) {
                const productResult = await client.query(
                    'SELECT stock_qty, name FROM ${TABLE.products} WHERE product_id = $1 FOR UPDATE',
                    [item.product_id]
                );

                if (productResult.rows.length === 0) {
                    throw new Error(`Product not found: ${item.product_id}`);
                }

                const product = productResult.rows[0];
                const totalQuantityNeeded = (parseInt(item.quantity) || 1) * learners.length;
                
                if (product.stock_qty < totalQuantityNeeded) {
                    throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock_qty}, Needed: ${totalQuantityNeeded}`);
                }
            }

            // 3. Create batch record
            const batchId = uuidv4();
            const totalBatchValue = items.reduce((sum, item) => {
                const productPrice = parseFloat(item.unit_price) || 0;
                const quantity = parseInt(item.quantity) || 1;
                return sum + (productPrice * quantity * learners.length);
            }, 0);

            await client.query(`
                INSERT INTO batches (
                    batch_id, batch_name, class, program_type, total_items,
                    total_value, status, operation_type, target_class,
                    created_by, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, 'processed', 'allocation',
                          $7, $8, NOW())
            `, [
                batchId,
                `Batch Allocation - ${class_name} - Program ${program_type}`,
                class_name,
                program_type,
                items.length * learners.length,
                totalBatchValue,
                class_name,
                userName || 'Admin'
            ]);

            // 4. Process each learner
            const results = {
                successful: [],
                failed: []
            };

            for (const learner of learners) {
                try {
                    const allocationResult = await this.createAllocation({
                        learner_id: learner.customer_id,
                        items: items,
                        program_type: program_type,
                        allocation_notes: `${allocation_notes} (Batch: ${class_name})`,
                        is_batch: true,
                        batch_class: class_name
                    }, userInfo);

                    results.successful.push({
                        learner_id: learner.customer_id,
                        learner_name: learner.name,
                        sale_id: allocationResult.sale_id,
                        total: allocationResult.total
                    });

                } catch (error) {
                    results.failed.push({
                        learner_id: learner.customer_id,
                        learner_name: learner.name,
                        error: error.message
                    });
                }
            }

            await client.query('COMMIT');

            return {
                success: true,
                batch_id: batchId,
                class: class_name,
                program_type: program_type,
                total_learners: learners.length,
                results: results,
                summary: {
                    successful: results.successful.length,
                    failed: results.failed.length,
                    total_value: totalBatchValue
                }
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error in batch allocation:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // =============== ALLOCATION QUERIES ===============

    async getLearnerAllocations(learnerId) {
        try {
            // Get allocation history for learner
            const query = `
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
                    ah.frequency,
                    ah.given_date,
                    ah.given_by,
                    ah.notes,
                    ah.is_allocation,
                    p.department,
                    p.category
                FROM ${TABLE.allocation_history} ah
                LEFT JOIN ${TABLE.products} p ON ah.product_id = p.product_id
                WHERE ah.customer_id = $1 AND ah.is_allocation = TRUE
                ORDER BY ah.given_date DESC
            `;

            const result = await db.query(query, [learnerId]);
            return result.rows;
        } catch (error) {
            console.error('Error getting learner allocations:', error);
            throw error;
        }
    }

    async getAllocationsByProgram(programType, filters = {}) {
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
                    p.department
                FROM ${TABLE.allocation_history} ah
                LEFT JOIN ${TABLE.products} p ON ah.product_id = p.product_id
                WHERE ah.program_type = $1 AND ah.is_allocation = TRUE
            `;

            const params = [programType];
            let paramCount = 1;

            if (filters.class_name) {
                paramCount++;
                query += ` AND ah.customer_class = $${paramCount}`;
                params.push(filters.class_name);
            }

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

            query += ` ORDER BY ah.given_date DESC LIMIT 100`;

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting allocations by program:', error);
            throw error;
        }
    }

    async getAllocationSummary(programType, period = 'month') {
        try {
            let dateFilter = '';
            const now = new Date();

            switch (period) {
                case 'day':
                    dateFilter = `AND given_date >= CURRENT_DATE`;
                    break;
                case 'week':
                    dateFilter = `AND given_date >= CURRENT_DATE - INTERVAL '7 days'`;
                    break;
                case 'month':
                    dateFilter = `AND given_date >= CURRENT_DATE - INTERVAL '30 days'`;
                    break;
                case 'year':
                    dateFilter = `AND given_date >= CURRENT_DATE - INTERVAL '365 days'`;
                    break;
            }

            const query = `
                SELECT 
                    COUNT(DISTINCT customer_id) as total_learners,
                    COUNT(*) as total_allocations,
                    SUM(quantity) as total_items,
                    SUM(quantity * unit_price) as total_value,
                    DATE(given_date) as allocation_date,
                    customer_class,
                    department
                FROM ${TABLE.allocation_history}
                WHERE program_type = $1 
                  AND is_allocation = TRUE
                  ${dateFilter}
                GROUP BY DATE(given_date), customer_class, department
                ORDER BY allocation_date DESC
            `;

            const result = await db.query(query, [programType]);
            return result.rows;
        } catch (error) {
            console.error('Error getting allocation summary:', error);
            throw error;
        }
    }

    // =============== BATCH OPERATIONS ===============

    async getBatches(filters = {}) {
        try {
            let query = `
                SELECT 
                    batch_id,
                    batch_name,
                    class,
                    program_type,
                    total_items,
                    total_value,
                    status,
                    operation_type,
                    created_by,
                    created_at,
                    processed_at
                FROM batches
                WHERE 1=1
            `;

            const params = [];
            let paramCount = 0;

            if (filters.operation_type) {
                paramCount++;
                query += ` AND operation_type = $${paramCount}`;
                params.push(filters.operation_type);
            }

            if (filters.program_type) {
                paramCount++;
                query += ` AND program_type = $${paramCount}`;
                params.push(filters.program_type);
            }

            if (filters.class) {
                paramCount++;
                query += ` AND class = $${paramCount}`;
                params.push(filters.class);
            }

            if (filters.status) {
                paramCount++;
                query += ` AND status = $${paramCount}`;
                params.push(filters.status);
            }

            query += ` ORDER BY created_at DESC LIMIT 50`;

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting batches:', error);
            throw error;
        }
    }

    async getBatchDetails(batchId) {
        try {
            // Get batch info
            const batchResult = await db.query(
                'SELECT * FROM batches WHERE batch_id = $1',
                [batchId]
            );

            if (batchResult.rows.length === 0) {
                return null;
            }

            const batch = batchResult.rows[0];

            // Get allocations in this batch
            const allocationsResult = await db.query(`
                SELECT 
                    ah.*,
                    c.name as customer_name,
                    c.class as customer_class
                FROM ${TABLE.allocation_history} ah
                LEFT JOIN ${TABLE.customers} c ON ah.customer_id = c.customer_id
                WHERE ah.parent_allocation_id = $1
                ORDER BY ah.given_date DESC
            `, [batchId]);

            return {
                batch: batch,
                allocations: allocationsResult.rows,
                count: allocationsResult.rows.length
            };
        } catch (error) {
            console.error('Error getting batch details:', error);
            throw error;
        }
    }

    // =============== PROGRAM MANAGEMENT ===============

    async getProgramSummary() {
        try {
            const query = `
                SELECT 
                    program_type,
                    COUNT(DISTINCT customer_id) as total_learners,
                    COUNT(*) as total_allocations,
                    SUM(quantity) as total_items,
                    SUM(quantity * unit_price) as total_value
                FROM ${TABLE.allocation_history}
                WHERE is_allocation = TRUE
                GROUP BY program_type
                ORDER BY program_type
            `;

            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error getting program summary:', error);
            throw error;
        }
    }

    async getEligibleLearnersForProgram(programType, className = null) {
        try {
            let query = `
                SELECT 
                    customer_id,
                    name,
                    class,
                    program_membership,
                    total_items_cost,
                    balance,
                    parent_name
                FROM ${TABLE.customers}
                WHERE program_membership LIKE $1
            `;

            const params = [`%${programType}%`];

            if (className) {
                query += ` AND class = $2`;
                params.push(className);
            }

            query += ` ORDER BY class, name`;

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting eligible learners:', error);
            throw error;
        }
    }
}

module.exports = new AllocationService();