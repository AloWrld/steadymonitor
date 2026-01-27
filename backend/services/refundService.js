// backend/services/refundService.js
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const TABLE = require('../config/table-map');
class RefundService {
    // =============== REFUND PROCESSING ===============

    async processRefund(refundData, userInfo) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const {
                original_sale_id,
                customer_id,
                items, // [{product_id, quantity, reason}]
                refund_type = 'full', // 'full', 'partial', 'exchange'
                exchange_items = [],
                reason,
                notes = ''
            } = refundData;

            const { userName, userRole } = userInfo;

            // 1. Get original sale with lock
            const saleResult = await client.query(
                `SELECT s.*, c.name as customer_name 
                 FROM ${TABLE.sales} s
                 LEFT JOIN ${TABLE.customers} c ON s.customer_id = c.customer_id
                 WHERE s.sale_id = $1 FOR UPDATE`,
                [original_sale_id]
            );

            if (saleResult.rows.length === 0) {
                throw new Error('Original sale not found');
            }

            const originalSale = saleResult.rows[0];

            // 2. Validate department access
            if (userRole !== 'admin' && userRole !== originalSale.department) {
                throw new Error(`Access denied. Original sale belongs to ${originalSale.department} department.`);
            }

            // 3. Process each refund item
            let totalRefundAmount = 0;
            const processedItems = [];

            for (const item of items) {
                // Get original sale item
                const saleItemResult = await client.query(
                    `SELECT * FROM ${TABLE.sale_items} 
                     WHERE sale_id = $1 AND product_id = $2 FOR UPDATE`,
                    [original_sale_id, item.product_id]
                );

                if (saleItemResult.rows.length === 0) {
                    throw new Error(`Product ${item.product_id} not found in original sale`);
                }

                const originalItem = saleItemResult.rows[0];
                const refundQuantity = Math.min(item.quantity || 1, originalItem.qty);

                // Calculate refund amount
                const refundAmount = refundQuantity * originalItem.unit_price;
                totalRefundAmount += refundAmount;

                // Restore stock
                await client.query(
                    'UPDATE ${TABLE.products} SET stock_qty = stock_qty + $1, updated_at = NOW() WHERE product_id = $2',
                    [refundQuantity, item.product_id]
                );

                // Create refund record for this item
                const refundId = uuidv4();
                await client.query(`
                    INSERT INTO ${TABLE.refunds} (
                        refund_id, original_sale_id, customer_id,
                        product_id, sku, amount_returned,
                        reason, date, processed_by, status, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, 'completed', NOW())
                `, [
                    refundId,
                    original_sale_id,
                    customer_id,
                    item.product_id,
                    originalItem.sku,
                    refundAmount,
                    `${reason} - ${item.reason || 'Item refund'}`,
                    userName
                ]);

                processedItems.push({
                    product_id: item.product_id,
                    product_name: originalItem.product_name,
                    quantity: refundQuantity,
                    unit_price: originalItem.unit_price,
                    refund_amount: refundAmount,
                    refund_id: refundId
                });
            }

            // 4. Update ${TABLE.customers} balance (refund reduces debt)
            if (customer_id && customer_id !== 'WALK_IN') {
                await client.query(`
                    UPDATE ${TABLE.customers} 
                    SET 
                        balance = GREATEST(0, balance - $1),
                        amount_paid = GREATEST(0, amount_paid - $1),
                        updated_at = NOW()
                    WHERE customer_id = $2
                `, [totalRefundAmount, customer_id]);

                // Record payment reversal
                await client.query(`
                    INSERT INTO ${TABLE.payments} (
                        payment_id, sale_id, customer_id, method, reference,
                        amount, date, status, notes, created_at
                    ) VALUES ($1, $2, $3, 'refund', $4, $5, NOW(), 'completed', $6, NOW())
                `, [
                    uuidv4(),
                    original_sale_id,
                    customer_id,
                    `REFUND-${Date.now()}`,
                    -totalRefundAmount, // Negative amount for refund
                    `Refund for sale ${original_sale_id}: ${reason}`
                ]);
            }

            // 5. Handle exchanges if any
            if (refund_type === 'exchange' && exchange_items.length > 0) {
                const exchangeResult = await this.processExchange(
                    original_sale_id,
                    customer_id,
                    items,
                    exchange_items,
                    userInfo,
                    reason
                );
                
                processedItems.push(...exchangeResult.items);
            }

            await client.query('COMMIT');

            return {
                success: true,
                refund_type,
                total_refund_amount: totalRefundAmount,
                original_sale: {
                    id: original_sale_id,
                    customer: originalSale.customer_name,
                    department: originalSale.department,
                    original_total: originalSale.total
                },
                processed_items: processedItems,
                customer_balance_updated: customer_id && customer_id !== 'WALK_IN',
                receipt_data: {
                    receipt_number: `REF-${Date.now().toString().substr(-8)}`,
                    date: new Date().toISOString(),
                    processed_by: userName,
                    reason: reason
                }
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error processing refund:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // =============== EXCHANGE PROCESSING ===============

    async processExchange(originalSaleId, customerId, returnItems, exchangeItems, userInfo, reason) {
        const client = await db.connect();
        
        try {
            // This would create a new sale for the exchange
            // For now, return a simplified version
            return {
                success: true,
                exchange_processed: true,
                items: exchangeItems.map(item => ({
                    ...item,
                    exchange_type: 'new_item'
                }))
            };

        } catch (error) {
            console.error('Error processing exchange:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // =============== RECEIPT GENERATION ===============

    async generateReceipt(saleId, receiptType = 'sale') {
        try {
            let query;
            let params = [saleId];

            switch (receiptType) {
                case 'sale':
                    query = `
                        SELECT 
                            s.sale_id,
                            s.date,
                            s.department,
                            s.served_by,
                            s.customer_id,
                            s.total,
                            s.paid,
                            s.balance,
                            s.payment_mode,
                            s.sale_type,
                            s.transaction_notes,
                            c.name as customer_name,
                            c.class as customer_class,
                            c.parent_name,
                            c.parent_phone,
                            json_agg(
                                json_build_object(
                                    'product_name', si.product_name,
                                    'sku', si.sku,
                                    'quantity', si.qty,
                                    'unit_price', si.unit_price,
                                    'total', si.qty * si.unit_price
                                )
                            ) as items
                        FROM ${TABLE.sales} s
                        LEFT JOIN ${TABLE.customers} c ON s.customer_id = c.customer_id
                        LEFT JOIN ${TABLE.sale_items} si ON s.sale_id = si.sale_id
                        WHERE s.sale_id = $1
                        GROUP BY s.sale_id, s.date, s.department, s.served_by, 
                                 s.customer_id, s.total, s.paid, s.balance,
                                 s.payment_mode, s.sale_type, s.transaction_notes,
                                 c.name, c.class, c.parent_name, c.parent_phone
                    `;
                    break;

                case 'refund':
                    query = `
                        SELECT 
                            r.refund_id,
                            r.date,
                            r.amount_returned,
                            r.reason,
                            r.processed_by,
                            r.original_sale_id,
                            s.department,
                            s.served_by as original_cashier,
                            c.name as customer_name,
                            c.class as customer_class
                        FROM ${TABLE.refunds} r
                        LEFT JOIN ${TABLE.sales} s ON r.original_sale_id = s.sale_id
                        LEFT JOIN ${TABLE.customers} c ON r.customer_id = c.customer_id
                        WHERE r.refund_id = $1
                    `;
                    break;

                default:
                    throw new Error('Invalid receipt type');
            }

            const result = await db.query(query, params);
            
            if (result.rows.length === 0) {
                throw new Error(`${receiptType} not found: ${saleId}`);
            }

            const receipt = result.rows[0];
            
            // Format receipt for printing
            return {
                receipt_number: `${receiptType === 'sale' ? 'SALE' : 'REFUND'}-${saleId.substr(-8)}`,
                date: receipt.date,
                type: receiptType === 'sale' ? 'Sale Receipt' : 'Refund Receipt',
                details: receipt,
                totals: {
                    subtotal: receiptType === 'sale' ? receipt.total / 1.16 : 0,
                    tax: receiptType === 'sale' ? receipt.total * 0.16 / 1.16 : 0,
                    total: receiptType === 'sale' ? receipt.total : receipt.amount_returned
                },
                footer: {
                    generated_at: new Date().toISOString(),
                    system: 'SteadyMonitor POS'
                }
            };

        } catch (error) {
            console.error('Error generating receipt:', error);
            throw error;
        }
    }

    // =============== REFUND QUERIES ===============

    async getRefundsBySale(saleId) {
        try {
            const result = await db.query(`
                SELECT 
                    r.*,
                    p.name as product_name,
                    p.sku,
                    c.name as customer_name
                FROM ${TABLE.refunds} r
                LEFT JOIN ${TABLE.products} p ON r.product_id = p.product_id
                LEFT JOIN ${TABLE.customers} c ON r.customer_id = c.customer_id
                WHERE r.original_sale_id = $1
                ORDER BY r.date DESC
            `, [saleId]);

            return result.rows;
        } catch (error) {
            console.error('Error getting refunds by sale:', error);
            throw error;
        }
    }

    async getRefundSummary(period = 'month') {
        try {
            let dateFilter = '';
            
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
                    DATE(date) as refund_date,
                    COUNT(*) as refund_count,
                    SUM(amount_returned) as total_refunded,
                    COUNT(DISTINCT customer_id) as unique_customers,
                    COUNT(DISTINCT original_sale_id) as unique_sales
                FROM ${TABLE.refunds}
                WHERE status = 'completed'
                  ${dateFilter}
                GROUP BY DATE(date)
                ORDER BY refund_date DESC
            `;

            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error getting refund summary:', error);
            throw error;
        }
    }
}

module.exports = new RefundService();