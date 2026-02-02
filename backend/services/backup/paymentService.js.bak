// backend/services/paymentService.js
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const TABLE = require('../config/table-map');
class PaymentService {
    // =============== PAYMENT PROCESSING ===============

    async recordPayment(paymentData, userInfo) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const {
                learner_id,
                amount,
                payment_method,
                reference = '',
                notes = '',
                sale_id = null,
                is_installment = false
            } = paymentData;

            const { userName, userRole } = userInfo;

            // 1. Validate amount
            if (!amount || amount <= 0) {
                throw new Error('Valid payment amount is required');
            }

            // 2. Get learner with lock
            const learnerResult = await client.query(
                'SELECT * FROM ${TABLE.customers} WHERE customer_id = $1 FOR UPDATE',
                [learner_id]
            );

            if (learnerResult.rows.length === 0) {
                throw new Error('Learner not found');
            }

            const learner = learnerResult.rows[0];

            // 3. Create payment record
            const paymentId = uuidv4();
            const paymentQuery = `
                INSERT INTO ${TABLE.payments} (
                    payment_id, sale_id, customer_id, method, reference,
                    amount, date, is_installment, status, notes,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, 'completed', $8, NOW())
                RETURNING *
            `;

            const paymentResult = await client.query(paymentQuery, [
                paymentId,
                sale_id,
                learner_id,
                payment_method || 'cash',
                reference || `PAY-${Date.now()}`,
                amount,
                is_installment,
                notes || 'Payment recorded'
            ]);

            const payment = paymentResult.rows[0];

            // 4. Update ${TABLE.customers} balance (REDUCE balance - payments reduce debt)
            const currentBalance = parseFloat(learner.balance) || 0;
            const currentAmountPaid = parseFloat(learner.amount_paid) || 0;
            
            const newBalance = Math.max(0, currentBalance - amount);
            const newAmountPaid = currentAmountPaid + amount;

            await client.query(`
                UPDATE ${TABLE.customers} 
                SET 
                    amount_paid = $1,
                    balance = $2,
                    last_payment_date = NOW(),
                    updated_at = NOW()
                WHERE customer_id = $3
            `, [newAmountPaid, newBalance, learner_id]);

            // 5. If linked to a sale, update ${TABLE.sales} balance
            if (sale_id) {
                await client.query(`
                    UPDATE ${TABLE.sales} 
                    SET 
                        paid = paid + $1,
                        balance = GREATEST(0, total - (paid + $1) - discount_amount),
                        updated_at = NOW()
                    WHERE sale_id = $2
                `, [amount, sale_id]);
            }

            // 6. If installment, record in installment_payments
            if (is_installment) {
                await client.query(`
                    INSERT INTO ${TABLE.installment_payments} (
                        installment_id, customer_id, customer_name, amount,
                        parent_name, parent_phone, payment_method,
                        reference, payment_date, recorded_by, notes, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, NOW())
                `, [
                    uuidv4(),
                    learner_id,
                    learner.name,
                    amount,
                    learner.parent_name || '',
                    learner.parent_phone || '',
                    payment_method || 'cash',
                    reference || `INST-${Date.now()}`,
                    userName || 'System',
                    notes || 'Installment payment'
                ]);

                // Update ${TABLE.installments} status
                const installmentStatus = newBalance <= 0 ? 'fully_paid' : 'partially_paid';
                await client.query(
                    'UPDATE ${TABLE.customers} SET installment_status = $1 WHERE customer_id = $2',
                    [installmentStatus, learner_id]
                );
            }

            await client.query('COMMIT');

            return {
                payment_id: paymentId,
                payment: payment,
                learner: {
                    id: learner_id,
                    name: learner.name,
                    previous_balance: currentBalance,
                    new_balance: newBalance,
                    amount_paid: amount
                },
                sale_id: sale_id
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error recording payment:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async recordBulkPayments(paymentsData, userInfo) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const results = {
                successful: [],
                failed: []
            };

            for (const paymentData of paymentsData) {
                try {
                    const result = await this.recordPayment(paymentData, userInfo);
                    results.successful.push(result);
                } catch (error) {
                    results.failed.push({
                        learner_id: paymentData.learner_id,
                        error: error.message
                    });
                }
            }

            await client.query('COMMIT');

            return {
                success: true,
                total_payments: paymentsData.length,
                successful: results.successful.length,
                failed: results.failed.length,
                results: results
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error recording bulk payments:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // =============== PAYMENT QUERIES ===============

    async getLearnerPayments(learnerId, filters = {}) {
        try {
            let query = `
                SELECT 
                    p.payment_id,
                    p.sale_id,
                    p.customer_id,
                    p.method,
                    p.reference,
                    p.amount,
                    p.date,
                    p.is_installment,
                    p.status,
                    p.notes,
                    p.created_at,
                    s.department,
                    s.served_by
                FROM ${TABLE.payments} p
                LEFT JOIN ${TABLE.sales} s ON p.sale_id = s.sale_id
                WHERE p.customer_id = $1
            `;

            const params = [learnerId];
            let paramCount = 1;

            if (filters.start_date) {
                paramCount++;
                query += ` AND p.date >= $${paramCount}`;
                params.push(filters.start_date);
            }

            if (filters.end_date) {
                paramCount++;
                query += ` AND p.date <= $${paramCount}`;
                params.push(filters.end_date);
            }

            if (filters.payment_method) {
                paramCount++;
                query += ` AND p.method = $${paramCount}`;
                params.push(filters.payment_method);
            }

            query += ` ORDER BY p.date DESC LIMIT 100`;

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting learner payments:', error);
            throw error;
        }
    }

    async getPaymentSummary(period = 'month') {
        try {
            let dateFilter = '';
            const now = new Date();

            switch (period) {
                case 'day':
                    dateFilter = `AND date >= CURRENT_DATE`;
                    break;
                case 'week':
                    dateFilter = `AND date >= CURRENT_DATE - INTERVAL '7 days'`;
                    break;
                case 'month':
                    dateFilter = `AND date >= CURRENT_DATE - INTERVAL '30 days'`;
                    break;
                case 'year':
                    dateFilter = `AND date >= CURRENT_DATE - INTERVAL '365 days'`;
                    break;
            }

            const query = `
                SELECT 
                    DATE(date) as payment_date,
                    method,
                    COUNT(*) as payment_count,
                    SUM(amount) as total_amount,
                    COUNT(DISTINCT customer_id) as unique_customers
                FROM ${TABLE.payments}
                WHERE status = 'completed'
                  ${dateFilter}
                GROUP BY DATE(date), method
                ORDER BY payment_date DESC
            `;

            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error getting payment summary:', error);
            throw error;
        }
    }

    async getOutstandingBalances(filters = {}) {
        try {
            let query = `
                SELECT 
                    c.customer_id,
                    c.name,
                    c.class,
                    c.boarding_status,
                    c.program_membership,
                    c.balance,
                    c.amount_paid,
                    c.total_items_cost,
                    c.payment_method,
                    c.installment_status,
                    c.parent_name,
                    c.parent_phone,
                    c.last_payment_date,
                    COUNT(p.payment_id) as payment_count,
                    COALESCE(SUM(p.amount), 0) as total_paid
                FROM ${TABLE.customers} c
                LEFT JOIN ${TABLE.payments} p ON c.customer_id = p.customer_id
                WHERE c.balance > 0
            `;

            const params = [];
            let paramCount = 0;

            if (filters.class_name) {
                paramCount++;
                query += ` AND c.class = $${paramCount}`;
                params.push(filters.class_name);
            }

            if (filters.program) {
                paramCount++;
                query += ` AND c.program_membership LIKE $${paramCount}`;
                params.push(`%${filters.program}%`);
            }

            if (filters.min_balance) {
                paramCount++;
                query += ` AND c.balance >= $${paramCount}`;
                params.push(parseFloat(filters.min_balance));
            }

            if (filters.max_balance) {
                paramCount++;
                query += ` AND c.balance <= $${paramCount}`;
                params.push(parseFloat(filters.max_balance));
            }

            query += ` GROUP BY c.customer_id ORDER BY c.balance DESC LIMIT 100`;

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting outstanding balances:', error);
            throw error;
        }
    }

    async getInstallmentPayments(learnerId) {
        try {
            const query = `
                SELECT 
                    ip.installment_id,
                    ip.customer_id,
                    ip.customer_name,
                    ip.amount,
                    ip.parent_name,
                    ip.parent_phone,
                    ip.payment_method,
                    ip.reference,
                    ip.payment_date,
                    ip.recorded_by,
                    ip.notes,
                    ip.created_at
                FROM ${TABLE.installment_payments} ip
                WHERE ip.customer_id = $1
                ORDER BY ip.payment_date DESC
            `;

            const result = await db.query(query, [learnerId]);
            return result.rows;
        } catch (error) {
            console.error('Error getting installment payments:', error);
            throw error;
        }
    }

    async getPaymentMethodsSummary() {
        try {
            const query = `
                SELECT 
                    method,
                    COUNT(*) as payment_count,
                    SUM(amount) as total_amount,
                    COUNT(DISTINCT customer_id) as unique_customers,
                    AVG(amount) as average_payment
                FROM ${TABLE.payments}
                WHERE status = 'completed'
                GROUP BY method
                ORDER BY total_amount DESC
            `;

            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error getting payment methods summary:', error);
            throw error;
        }
    }

    // =============== PAYMENT VALIDATION ===============

    async validatePayment(learnerId, amount, paymentMethod) {
        try {
            // Get learner current balance
            const learnerResult = await db.query(
                'SELECT balance, name FROM ${TABLE.customers} WHERE customer_id = $1',
                [learnerId]
            );

            if (learnerResult.rows.length === 0) {
                return { valid: false, message: 'Learner not found' };
            }

            const learner = learnerResult.rows[0];
            const currentBalance = parseFloat(learner.balance) || 0;

            // Check if payment exceeds balance
            if (amount > currentBalance) {
                return {
                    valid: false,
                    message: `Payment amount (KES ${amount}) exceeds current balance (KES ${currentBalance})`
                };
            }

            // Validate payment method
            const validMethods = ['cash', 'mpesa', 'card', 'bank_transfer', 'cheque'];
            if (!validMethods.includes(paymentMethod)) {
                return {
                    valid: false,
                    message: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`
                };
            }

            return {
                valid: true,
                learner: {
                    id: learnerId,
                    name: learner.name,
                    current_balance: currentBalance,
                    new_balance_after: currentBalance - amount
                }
            };

        } catch (error) {
            console.error('Error validating payment:', error);
            throw error;
        }
    }

    async getPaymentById(paymentId) {
        try {
            const query = `
                SELECT 
                    p.*,
                    c.name as customer_name,
                    c.class,
                    s.department,
                    s.served_by
                FROM ${TABLE.payments} p
                LEFT JOIN ${TABLE.customers} c ON p.customer_id = c.customer_id
                LEFT JOIN ${TABLE.sales} s ON p.sale_id = s.sale_id
                WHERE p.payment_id = $1
            `;

            const result = await db.query(query, [paymentId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting payment by ID:', error);
            throw error;
        }
    }
}

module.exports = new PaymentService();