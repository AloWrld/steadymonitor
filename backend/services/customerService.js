// backend/services/customerService.js
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const TABLE = require('../config/table-map');
class CustomerService {
    // =============== CUSTOMER CRUD OPERATIONS ===============

    async getAllCustomers(filters = {}) {
        try {
            const { className, boardingStatus, program, search } = filters;
            let query = `
                SELECT 
                    customer_id, name, class, boarding_status, program_membership,
                    allocation_program, exercise_book_program, pocket_money_enabled,
                    allocation_frequency_metadata,
                    total_items_cost, amount_paid, balance,
                    contact, email, parent_name, parent_phone,
                    guardian_address, guardian_email,
                    payment_method, payment_duration_months, installment_status,
                    last_payment_date, next_payment_due,
                    notes, disbursement_notes, class_teacher,
                    created_at, updated_at
                FROM ${TABLE.customers}
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 0;

            if (className && className !== 'all') {
                paramCount++;
                query += ` AND class = $${paramCount}`;
                params.push(className);
            }

            if (boardingStatus && boardingStatus !== 'all') {
                paramCount++;
                query += ` AND boarding_status = $${paramCount}`;
                params.push(boardingStatus);
            }

            if (program && program !== 'all') {
                paramCount++;
                if (program === 'A' || program === 'B') {
                    query += ` AND program_membership = $${paramCount}`;
                    params.push(program);
                } else if (program === 'none') {
                    query += ` AND program_membership = $${paramCount}`;
                    params.push('none');
                }
            }

            if (search) {
                paramCount++;
                query += ` AND (
                    name ILIKE $${paramCount} OR
                    class ILIKE $${paramCount} OR
                    parent_name ILIKE $${paramCount} OR
                    parent_phone LIKE $${paramCount} OR
                    customer_id::text ILIKE $${paramCount}
                )`;
                params.push(`%${search}%`);
            }

            query += ` ORDER BY name ASC`;
            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting all customers:', error);
            throw error;
        }
    }

    async findCustomerById(customerId) {
        try {
            const result = await db.query(
                `SELECT * FROM ${TABLE.customers} WHERE customer_id = $1`,
                [customerId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error finding customer by ID:', error);
            throw error;
        }
    }

    async findCustomerByName(name) {
        try {
            const result = await db.query(
                `SELECT * FROM ${TABLE.customers} WHERE name ILIKE $1 LIMIT 10`,
                [`%${name}%`]
            );
            return result.rows;
        } catch (error) {
            console.error('Error finding customer by name:', error);
            throw error;
        }
    }

    async createCustomer(customerData) {
        try {
            const {
                name, class: className, boarding_status, program_membership,
                allocation_program, exercise_book_program, pocket_money_enabled,
                allocation_frequency_metadata,
                contact, email, parent_name, parent_phone,
                guardian_address, guardian_email,
                payment_method, payment_duration_months,
                notes, disbursement_notes, class_teacher
            } = customerData;

            const result = await db.query(
                `INSERT INTO ${TABLE.customers} (
                    name, class, boarding_status, program_membership,
                    allocation_program, exercise_book_program, pocket_money_enabled,
                    allocation_frequency_metadata,
                    total_items_cost, amount_paid, balance,
                    contact, email, parent_name, parent_phone,
                    guardian_address, guardian_email,
                    payment_method, payment_duration_months, installment_status,
                    notes, disbursement_notes, class_teacher,
                    created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8,
                    0, 0, 0, $9, $10, $11, $12, $13, $14,
                    $15, $16, 'not_paid', $17, $18, $19,
                    NOW(), NOW()
                ) RETURNING *`,
                [
                    name, className, boarding_status || 'Day', program_membership || 'none',
                    allocation_program || 'none', exercise_book_program || false,
                    pocket_money_enabled || false, allocation_frequency_metadata || '{}',
                    contact || '', email || '', parent_name || '', parent_phone || '',
                    guardian_address || '', guardian_email || '',
                    payment_method || 'installment', payment_duration_months || 0,
                    notes || '', disbursement_notes || '', class_teacher || ''
                ]
            );

            return result.rows[0];
        } catch (error) {
            console.error('Error creating customer:', error);
            throw error;
        }
    }

    async updateCustomer(customerId, updates) {
        try {
            const fields = [];
            const values = [];
            let paramCount = 0;

            const allowedFields = [
                'name', 'class', 'boarding_status', 'program_membership',
                'allocation_program', 'exercise_book_program', 'pocket_money_enabled',
                'allocation_frequency_metadata',
                'contact', 'email', 'parent_name', 'parent_phone',
                'guardian_address', 'guardian_email',
                'payment_method', 'payment_duration_months', 'installment_status',
                'last_payment_date', 'next_payment_due',
                'notes', 'disbursement_notes', 'class_teacher'
            ];

            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key) && updates[key] !== undefined) {
                    paramCount++;
                    fields.push(`${key} = $${paramCount}`);
                    values.push(updates[key]);
                }
            });

            if (fields.length === 0) {
                throw new Error('No valid fields to update');
            }

            paramCount++;
            fields.push(`updated_at = $${paramCount}`);
            values.push(new Date());

            paramCount++;
            values.push(customerId);

            const query = `
                UPDATE ${TABLE.customers} 
                SET ${fields.join(', ')}
                WHERE customer_id = $${paramCount}
                RETURNING *
            `;

            const result = await db.query(query, values);
            
            if (result.rows.length === 0) {
                throw new Error('Customer not found');
            }

            return result.rows[0];
        } catch (error) {
            console.error('Error updating customer:', error);
            throw error;
        }
    }

    async deleteCustomer(customerId) {
        try {
            const result = await db.query(
                `DELETE FROM ${TABLE.customers} WHERE customer_id = $1 RETURNING name`,
                [customerId]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Customer not found');
            }

            return { name: result.rows[0].name };
        } catch (error) {
            console.error('Error deleting customer:', error);
            throw error;
        }
    }

    // =============== PAYMENT & BALANCE MANAGEMENT ===============

    async updateCustomerBalance(customerId, amount, paymentData = {}) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            // 1. Get current customer with lock
            const customerResult = await client.query(
                // CORRECT
`SELECT balance, total_items_cost, amount_paid FROM ${TABLE.customers} WHERE customer_id = $1 FOR UPDATE`,
                [customerId]
            );

            if (customerResult.rows.length === 0) {
                throw new Error('Customer not found');
            }

            const customer = customerResult.rows[0];
            const currentBalance = parseFloat(customer.balance) || 0;
            const currentAmountPaid = parseFloat(customer.amount_paid) || 0;
            const currentTotalCost = parseFloat(customer.total_items_cost) || 0;

            // 2. Calculate new values
            const newAmountPaid = currentAmountPaid + Math.abs(amount);
            const newBalance = Math.max(0, currentTotalCost - newAmountPaid);

            // 3. Update ${TABLE.customers} balance
            await client.query(
                `UPDATE ${TABLE.customers} 
                 SET amount_paid = $1, balance = $2, updated_at = NOW()
                 WHERE customer_id = $3`,
                [newAmountPaid, newBalance, customerId]
            );

            // 4. Record payment if payment data provided
            let paymentRecord = null;
            if (paymentData.amount) {
                const paymentResult = await client.query(
                    `INSERT INTO ${TABLE.payments} (
                        payment_id, customer_id, sale_id, method, reference, 
                        amount, date, is_installment, status, notes, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, 'completed', $8, NOW())
                    RETURNING *`,
                    [
                        uuidv4(),
                        customerId,
                        paymentData.sale_id || null,
                        paymentData.method || 'cash',
                        paymentData.reference || `PAY-${Date.now()}`,
                        paymentData.amount,
                        paymentData.is_installment || false,
                        paymentData.notes || ''
                    ]
                );
                paymentRecord = paymentResult.rows[0];
            }

            await client.query('COMMIT');

            return {
                customer_id: customerId,
                previous_balance: currentBalance,
                new_balance: newBalance,
                payment: paymentRecord
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating customer balance:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getTotalInstallmentPaid(customerId) {
        try {
            const result = await db.query(
                'SELECT COALESCE(SUM(amount), 0) as total FROM ${TABLE.installment_payments} WHERE customer_id = $1',
                [customerId]
            );
            return parseFloat(result.rows[0].total) || 0;
        } catch (error) {
            console.error('Error getting total installment paid:', error);
            return 0;
        }
    }

    async recordInstallmentPayment(installmentData) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const {
                customer_id, amount, payment_method, reference,
                parent_name, parent_phone, notes, recorded_by
            } = installmentData;

            // 1. Get customer info
            const customerResult = await client.query(
                'SELECT name, balance FROM ${TABLE.customers} WHERE customer_id = $1 FOR UPDATE',
                [customer_id]
            );

            if (customerResult.rows.length === 0) {
                throw new Error('Customer not found');
            }

            const customer = customerResult.rows[0];

            // 2. Record installment payment
            const installmentResult = await client.query(
                `INSERT INTO ${TABLE.installment_payments} (
                    installment_id, customer_id, customer_name, amount,
                    parent_name, parent_phone, payment_method,
                    reference, payment_date, recorded_by, notes, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, NOW())
                RETURNING *`,
                [
                    uuidv4(),
                    customer_id,
                    customer.name,
                    amount,
                    parent_name,
                    parent_phone,
                    payment_method || 'cash',
                    reference || `INST-${Date.now()}`,
                    recorded_by || 'System',
                    notes || ''
                ]
            );

            // 3. Update ${TABLE.customers} balance
            await this.updateCustomerBalance(
                customer_id,
                -amount,
                {
                    amount,
                    method: payment_method,
                    reference,
                    is_installment: true,
                    notes,
                    recorded_by
                }
            );

            // 4. Update ${TABLE.installments} status
            const totalInstallments = await this.getTotalInstallmentPaid(customer_id);
            const currentBalance = parseFloat(customer.balance) || 0;
            const installmentStatus = totalInstallments >= currentBalance ? 'fully_paid' : 'partially_paid';
            
            await client.query(
                'UPDATE ${TABLE.customers} SET installment_status = $1, updated_at = NOW() WHERE customer_id = $2',
                [installmentStatus, customer_id]
            );

            await client.query('COMMIT');

            return {
                installment: installmentResult.rows[0],
                customer_id,
                new_balance: Math.max(0, currentBalance - amount)
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error recording installment payment:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // =============== ALLOCATION MANAGEMENT ===============

    async getCustomerAllocations(customerId) {
        try {
            // Get all active allocations
            const result = await db.query(
                `SELECT * FROM ${TABLE.allocations} 
                 WHERE customer_id = $1 AND status = 'allocated'
                 ORDER BY created_at DESC`,
                [customerId]
            );

            const allocations = result.rows;
            const now = new Date();
            const pendingItems = [];

            // Check each allocation for due status (matching Excel logic)
            for (const alloc of allocations) {
                if (!alloc.given_date) {
                    // First time allocation
                    pendingItems.push({
                        allocation_id: alloc.allocation_id,
                        product_id: alloc.product_id,
                        frequency: alloc.frequency,
                        reason: 'First allocation',
                        is_first_allocation: true
                    });
                    continue;
                }

                const lastDate = new Date(alloc.given_date);
                let isDue = false;
                let reason = '';
                let daysOverdue = 0;

                switch (alloc.frequency) {
                    case 'yearly':
                        const yearlyDiff = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24 * 365));
                        if (yearlyDiff >= 1) {
                            isDue = true;
                            daysOverdue = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)) - 365;
                            reason = `Yearly allocation due (${yearlyDiff} year${yearlyDiff > 1 ? 's' : ''} since last)`;
                        }
                        break;

                    case 'termly':
                        const termlyDiff = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24 * 90));
                        if (termlyDiff >= 1) {
                            isDue = true;
                            daysOverdue = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)) - 90;
                            reason = `Termly allocation due (${termlyDiff} term${termlyDiff > 1 ? 's' : ''} since last)`;
                        }
                        break;

                    case 'monthly':
                        const monthlyDiff = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24 * 30));
                        if (monthlyDiff >= 1) {
                            isDue = true;
                            daysOverdue = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)) - 30;
                            reason = `Monthly allocation due (${monthlyDiff} month${monthlyDiff > 1 ? 's' : ''} since last)`;
                        }
                        break;

                    case 'weekly':
                        const weeklyDiff = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24 * 7));
                        if (weeklyDiff >= 1) {
                            isDue = true;
                            daysOverdue = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)) - 7;
                            reason = `Weekly allocation due (${weeklyDiff} week${weeklyDiff > 1 ? 's' : ''} since last)`;
                        }
                        break;

                    case 'specific_days':
                        if (alloc.specific_days) {
                            const days = alloc.specific_days.split(',').map(d => d.trim().toLowerCase());
                            const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                            const lastGivenDay = lastDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                            
                            if (days.includes(today) && (today !== lastGivenDay || (now - lastDate) > (1000 * 60 * 60 * 24))) {
                                isDue = true;
                                reason = `Scheduled allocation for ${today}`;
                            }
                        }
                        break;
                }

                if (isDue) {
                    pendingItems.push({
                        allocation_id: alloc.allocation_id,
                        product_id: alloc.product_id,
                        frequency: alloc.frequency,
                        last_given: alloc.given_date,
                        days_overdue: daysOverdue,
                        reason: reason,
                        is_first_allocation: false,
                        specific_days: alloc.specific_days
                    });
                }
            }

            return {
                allocations,
                pending_items: pendingItems,
                total_allocations: allocations.length,
                pending_count: pendingItems.length
            };
        } catch (error) {
            console.error('Error getting customer allocations:', error);
            throw error;
        }
    }

    async addAllocation(allocationData) {
        try {
            const {
                customer_id, product_id, frequency, specific_days,
                notes, quantity = 1
            } = allocationData;

            // Get customer and product details
            const [customerResult, productResult] = await Promise.all([
                db.query('SELECT name, class FROM ${TABLE.customers} WHERE customer_id = $1', [customer_id]),
                db.query('SELECT sku, name FROM ${TABLE.products} WHERE product_id = $1', [product_id])
            ]);

            if (customerResult.rows.length === 0) {
                throw new Error('Customer not found');
            }
            if (productResult.rows.length === 0) {
                throw new Error('Product not found');
            }

            const customer = customerResult.rows[0];
            const product = productResult.rows[0];

            // Calculate next due date (matching Excel logic)
            const nextDueDate = this.calculateNextDueDate(frequency, specific_days);

            const result = await db.query(
                `INSERT INTO ${TABLE.allocations} (
                    allocation_id, customer_id, customer_name, customer_class,
                    product_id, sku, product_name, quantity,
                    frequency, specific_days, next_due_date,
                    notes, status, allocation_date, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'allocated', NOW(), NOW(), NOW())
                RETURNING *`,
                [
                    uuidv4(),
                    customer_id, customer.name, customer.class,
                    product_id, product.sku, product.name, quantity,
                    frequency, specific_days || '', nextDueDate,
                    notes || ''
                ]
            );

            return result.rows[0];
        } catch (error) {
            console.error('Error adding allocation:', error);
            throw error;
        }
    }

    async fulfillAllocation(allocationId, recordedBy) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            // 1. Get allocation details with product stock
            const allocationResult = await client.query(
                `SELECT a.*, p.stock_qty 
                 FROM ${TABLE.allocations} a
                 JOIN ${TABLE.products} p ON a.product_id = p.product_id
                 WHERE a.allocation_id = $1 FOR UPDATE`,
                [allocationId]
            );

            if (allocationResult.rows.length === 0) {
                throw new Error('Allocation not found');
            }

            const allocation = allocationResult.rows[0];

            // 2. Check stock (matching Excel logic)
            if (allocation.stock_qty < (allocation.quantity || 1)) {
                throw new Error(`Insufficient stock. Available: ${allocation.stock_qty}, Required: ${allocation.quantity || 1}`);
            }

            // 3. Update ${TABLE.products} stock
            await client.query(
                'UPDATE ${TABLE.products} SET stock_qty = stock_qty - $1, updated_at = NOW() WHERE product_id = $2',
                [allocation.quantity || 1, allocation.product_id]
            );

            // 4. Update ${TABLE.allocations}
            const nextDueDate = this.calculateNextDueDate(allocation.frequency, allocation.specific_days);
            await client.query(
                `UPDATE ${TABLE.allocations} 
                 SET given_date = NOW(), next_due_date = $1, updated_at = NOW()
                 WHERE allocation_id = $2
                 RETURNING *`,
                [nextDueDate, allocationId]
            );

            // 5. Record in allocation history
            const historyResult = await client.query(
                `INSERT INTO ${TABLE.allocation_history} (
                    history_id, customer_id, customer_name, customer_class,
                    allocation_id, product_id, sku, product_name, quantity,
                    program_type, frequency, given_date, given_by, notes, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, NOW())
                RETURNING *`,
                [
                    uuidv4(),
                    allocation.customer_id,
                    allocation.customer_name,
                    allocation.customer_class,
                    allocationId,
                    allocation.product_id,
                    allocation.sku,
                    allocation.product_name,
                    allocation.quantity || 1,
                    'A', // Program A for allocations
                    allocation.frequency,
                    recordedBy || 'System',
                    `Fulfilled allocation - ${allocation.frequency}`
                ]
            );

            await client.query('COMMIT');

            return {
                allocation: allocationResult.rows[0],
                history: historyResult.rows[0]
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error fulfilling allocation:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // =============== BATCH OPERATIONS ===============

    async batchCreateCustomers(learners, class_name, boarding_status, program_membership) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const createdLearners = [];
            const errors = [];

            for (const [index, learner] of learners.entries()) {
                try {
                    const result = await client.query(
                        `INSERT INTO ${TABLE.customers} (
                            customer_id, name, class, boarding_status, program_membership,
                            allocation_program, exercise_book_program, pocket_money_enabled,
                            total_items_cost, amount_paid, balance,
                            contact, email, parent_name, parent_phone,
                            payment_method, payment_duration_months, installment_status,
                            notes, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
                            0, 0, 0, $9, $10, $11, $12, $13, $14, 'not_paid',
                            $15, NOW(), NOW()
                        ) RETURNING customer_id, name, class`,
                        [
                            uuidv4(),
                            learner.name.trim(),
                            learner.class || class_name || '',
                            learner.boarding_status || boarding_status || 'Day',
                            learner.program_membership || program_membership || 'none',
                            learner.allocation_program || 'none',
                            learner.exercise_book_program || false,
                            (learner.pocket_money_enabled && (learner.boarding_status || boarding_status) === 'Boarding') || false,
                            learner.contact || '',
                            learner.email || '',
                            learner.parent_name || '',
                            learner.parent_phone || '',
                            learner.payment_method || 'installment',
                            learner.payment_duration_months || 0,
                            learner.notes || ''
                        ]
                    );

                    createdLearners.push(result.rows[0]);
                } catch (error) {
                    errors.push({
                        index,
                        name: learner.name,
                        error: error.message
                    });
                }
            }

            await client.query('COMMIT');

            return {
                created_learners: createdLearners,
                errors,
                created_count: createdLearners.length,
                error_count: errors.length
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error batch creating customers:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getCustomersByClass(className, filters = {}) {
        try {
            const { program, boarding } = filters;
            let query = `
                SELECT * FROM ${TABLE.customers} 
                WHERE class = $1
            `;
            const params = [className];
            let paramCount = 1;

            if (program && program !== 'all') {
                paramCount++;
                query += ` AND program_membership = $${paramCount}`;
                params.push(program);
            }

            if (boarding && boarding !== 'all') {
                paramCount++;
                query += ` AND boarding_status = $${paramCount}`;
                params.push(boarding);
            }

            query += ` ORDER BY name ASC`;

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting customers by class:', error);
            throw error;
        }
    }

    async batchUpdatePaymentInfo(class_name, payment_method, payment_duration_months, notes) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const updateResult = await client.query(
                `UPDATE ${TABLE.customers} 
                 SET payment_method = COALESCE($1, payment_method),
                     payment_duration_months = COALESCE($2, payment_duration_months),
                     notes = CASE 
                         WHEN $3 IS NOT NULL AND notes IS NOT NULL THEN notes || '\n' || $3
                         WHEN $3 IS NOT NULL THEN $3
                         ELSE notes
                     END,
                     updated_at = NOW()
                 WHERE class = $4
                 RETURNING customer_id, name`,
                [
                    payment_method,
                    payment_duration_months,
                    notes,
                    class_name
                ]
            );

            await client.query('COMMIT');

            return {
                updated_count: updateResult.rowCount,
                updated_learners: updateResult.rows
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error batch updating payment info:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // =============== PROMOTION & CLASS MANAGEMENT ===============

    async promoteLearner(customerId, newClass, promotionType, academicYear, promotedBy, notes = '') {
        try {
            // Use the PostgreSQL function we created
            const result = await db.query(
                `SELECT promote_learner($1, $2, $3, $4, $5, $6) as result`,
                [customerId, newClass, promotionType, academicYear, promotedBy, notes]
            );

            return result.rows[0].result;
        } catch (error) {
            console.error('Error promoting learner:', error);
            throw error;
        }
    }

    async batchPromoteClass(currentClass, newClass, academicYear, promotedBy, excludeIds = []) {
        try {
            // Use the PostgreSQL function we created
            const result = await db.query(
                `SELECT batch_promote_class($1, $2, $3, $4, $5) as result`,
                [currentClass, newClass, academicYear, promotedBy, excludeIds]
            );

            return result.rows[0].result;
        } catch (error) {
            console.error('Error batch promoting class:', error);
            throw error;
        }
    }

    async changeLearnerClass(customerId, newClass, notes, changedBy) {
        return this.promoteLearner(
            customerId,
            newClass,
            'class_change',
            new Date().getFullYear().toString(),
            changedBy,
            notes
        );
    }

    // =============== REPORTS & LEDGER ===============

    async getCustomerLedger(customerId) {
        try {
            // Get debts
            const debtsResult = await db.query(
                `SELECT * FROM ${TABLE.debts} 
                 WHERE customer_id = $1 
                 ORDER BY created_at DESC`,
                [customerId]
            );

            // Get payments
            const paymentsResult = await db.query(
                `SELECT * FROM ${TABLE.payments} 
                 WHERE customer_id = $1 
                 ORDER BY date DESC`,
                [customerId]
            );

            const debts = debtsResult.rows;
            const payments = paymentsResult.rows;

            // Combine and sort (matching Excel logic)
            const ledger = [
                ...debts.map(d => ({
                    type: 'debt',
                    id: d.debt_id,
                    date: d.created_at,
                    description: `Debt from ${TABLE.sales}`,
                    amount: -parseFloat(d.balance) || 0,
                    status: d.status,
                    reference: d.sale_id
                })),
                ...payments.map(p => ({
                    type: p.is_installment ? 'installment' : 'payment',
                    id: p.payment_id,
                    date: p.date,
                    description: p.is_installment ? `Installment via ${p.method}` : `Payment via ${p.method}`,
                    amount: parseFloat(p.amount) || 0,
                    status: 'Completed',
                    reference: p.reference,
                    notes: p.notes
                }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            const outstandingDebts = debts.filter(d => d.status === 'pending');
            const totalOutstanding = outstandingDebts.reduce((sum, d) => sum + (parseFloat(d.balance) || 0), 0);

            return {
                outstanding_balance: totalOutstanding,
                outstanding_debts: outstandingDebts,
                history: ledger.slice(0, 50),
                summary: {
                    total_debts: debts.length,
                    total_payments: payments.length,
                    active_debts: outstandingDebts.length
                }
            };
        } catch (error) {
            console.error('Error getting customer ledger:', error);
            throw error;
        }
    }

    async getCustomerTransactions(customerId) {
        try {
            // Get sales
            const salesResult = await db.query(
                `SELECT * FROM ${TABLE.sales} 
                 WHERE customer_id = $1 
                 ORDER BY date DESC`,
                [customerId]
            );

            // Get payments
            const paymentsResult = await db.query(
                `SELECT * FROM ${TABLE.payments} 
                 WHERE customer_id = $1 
                 ORDER BY date DESC`,
                [customerId]
            );

            const sales = salesResult.rows;
            const payments = paymentsResult.rows;

            // Categorize transactions (matching Excel logic)
            const transactions = [
                ...sales.map(s => ({
                    type: 'sale',
                    id: s.sale_id,
                    date: s.date,
                    amount: -parseFloat(s.total) || 0,
                    description: `${s.department} Sale`,
                    program_type: s.special_sale_type === 'pocket_money' ? 'C' : 
                                 (s.customer_type === 'batch' ? 'A' : 'regular'),
                    reference: s.sale_id,
                    status: s.status || 'Completed'
                })),
                ...payments.map(p => ({
                    type: p.is_installment ? 'installment_payment' : 'payment',
                    id: p.payment_id,
                    date: p.date,
                    amount: parseFloat(p.amount) || 0,
                    description: p.is_installment ? `Installment (${p.method})` : `Payment (${p.method})`,
                    program_type: 'payment',
                    reference: p.reference,
                    status: 'Completed'
                }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            // Summary by program type (matching Excel)
            const programSummary = {
                A: { count: 0, total: 0 },
                B: { count: 0, total: 0 },
                C: { count: 0, total: 0 },
                regular: { count: 0, total: 0 },
                payment: { count: 0, total: 0 }
            };

            transactions.forEach(t => {
                if (programSummary[t.program_type]) {
                    programSummary[t.program_type].count += 1;
                    programSummary[t.program_type].total += Math.abs(t.amount);
                }
            });

            return {
                count: transactions.length,
                program_summary: programSummary,
                transactions: transactions
            };
        } catch (error) {
            console.error('Error getting customer transactions:', error);
            throw error;
        }
    }

    async getDisbursementHistory(customerId) {
        try {
            // Get disbursements
            const disbursementsResult = await db.query(
                `SELECT * FROM ${TABLE.disbursements} 
                 WHERE customer_id = $1 
                 ORDER BY date DESC`,
                [customerId]
            );

            // Get payments
            const paymentsResult = await db.query(
                `SELECT * FROM ${TABLE.payments} 
                 WHERE customer_id = $1 
                 ORDER BY date DESC`,
                [customerId]
            );

            // Get allocation history
            const allocationHistoryResult = await db.query(
                `SELECT * FROM ${TABLE.allocation_history} 
                 WHERE customer_id = $1 
                 ORDER BY given_date DESC`,
                [customerId]
            );

            const disbursements = disbursementsResult.rows;
            const payments = paymentsResult.rows;
            const allocationHistory = allocationHistoryResult.rows;

            // Calculate totals (matching Excel logic)
            const totalDisbursed = disbursements.reduce((sum, d) => sum + (parseFloat(d.total_cost) || 0), 0);
            const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            const calculatedBalance = Math.max(0, totalDisbursed - totalPaid);

            return {
                disbursements,
                payments,
                allocation_history: allocationHistory,
                summary: {
                    total_disbursed: totalDisbursed,
                    total_paid: totalPaid,
                    calculated_balance: calculatedBalance,
                    disbursement_count: disbursements.length,
                    payment_count: payments.length
                }
            };
        } catch (error) {
            console.error('Error getting disbursement history:', error);
            throw error;
        }
    }

    async getInstallmentPayments(customerId) {
        try {
            const result = await db.query(
                `SELECT * FROM ${TABLE.installment_payments} 
                 WHERE customer_id = $1 
                 ORDER BY payment_date DESC`,
                [customerId]
            );
            return result.rows;
        } catch (error) {
            console.error('Error getting installment payments:', error);
            throw error;
        }
    }

    // =============== HELPER FUNCTIONS ===============

    calculateNextDueDate(frequency, specificDays = '') {
        const now = new Date();
        switch (frequency) {
            case 'yearly':
                return new Date(now.setFullYear(now.getFullYear() + 1));
            case 'termly':
                return new Date(now.setMonth(now.getMonth() + 4));
            case 'monthly':
                return new Date(now.setMonth(now.getMonth() + 1));
            case 'weekly':
                return new Date(now.setDate(now.getDate() + 7));
            case 'once_per_term':
                return new Date(now.setMonth(now.getMonth() + 4));
            case 'specific_days':
                if (specificDays) {
                    const days = specificDays.split(',').map(d => d.trim().toLowerCase());
                    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    
                    let nextDate = new Date(now);
                    for (let i = 1; i <= 7; i++) {
                        nextDate.setDate(nextDate.getDate() + 1);
                        const nextDayName = nextDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                        if (days.includes(nextDayName)) {
                            return nextDate;
                        }
                    }
                }
                return new Date(now.setDate(now.getDate() + 7));
            default:
                return new Date(now.setMonth(now.getMonth() + 1));
        }
    }

    async getUniqueClasses() {
        try {
            const result = await db.query(
                `WITH ranked_classes AS (
                    SELECT DISTINCT class,
                           CASE 
                             WHEN class ~ '^Form (\d+)' THEN CAST(SUBSTRING(class FROM 'Form (\d+)') AS INTEGER)
                             WHEN class ~ '^Class (\d+)' THEN CAST(SUBSTRING(class FROM 'Class (\d+)') AS INTEGER)
                             ELSE 99
                           END as class_order
                    FROM ${TABLE.customers} 
                    WHERE class IS NOT NULL AND class <> ''
                 )
                 SELECT class 
                 FROM ${TABLE.ranked_classes}
                 ORDER BY class_order, class`
            );
            return result.rows.map(row => row.class);
        } catch (error) {
            console.error('Error getting unique classes:', error);
            throw error;
        }
    }
    async getCustomerStatistics() {
        try {
            const result = await db.query(`
                SELECT * FROM ${TABLE.customer_statistics}
            `);
            return result.rows;
        } catch (error) {
            console.error('Error getting customer statistics:', error);
            throw error;
        }
    }
}

module.exports = new CustomerService();
