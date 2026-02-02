// backend/services/invoiceService.js
const db = require('../config/database');

const TABLE = require('../config/table-map');
class InvoiceService {
    // =============== INVOICE MANAGEMENT ===============
    
    async createInvoice(invoiceData, userInfo) {
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');
            
            const {
                customer_id,
                items,
                due_date,
                notes = '',
                terms = 'Net 30'
            } = invoiceData;
            
            const { userName } = userInfo;
            
            // 1. Get customer details
            const customerResult = await client.query(
                'SELECT * FROM ${TABLE.customers} WHERE customer_id = $1 FOR UPDATE',
                [customer_id]
            );
            
            if (customerResult.rows.length === 0) {
                throw new Error('Customer not found');
            }
            
            const customer = customerResult.rows[0];
            
            // 2. Calculate totals
            let subtotal = 0;
            const invoiceItems = [];
            
            for (const item of items) {
                const productResult = await client.query(
                    'SELECT * FROM ${TABLE.products} WHERE product_id = $1',
                    [item.product_id]
                );
                
                if (productResult.rows.length === 0) {
                    throw new Error(`Product not found: ${item.product_id}`);
                }
                
                const product = productResult.rows[0];
                const quantity = parseInt(item.quantity) || 1;
                const unitPrice = parseFloat(item.unit_price) || parseFloat(product.sell_price) || 0;
                const itemTotal = quantity * unitPrice;
                
                subtotal += itemTotal;
                
                invoiceItems.push({
                    product_id: product.product_id,
                    sku: product.sku,
                    description: item.description || product.name,
                    quantity,
                    unit_price: unitPrice,
                    total: itemTotal
                });
            }
            
            const tax = subtotal * 0.00;
            const total = subtotal + tax;
            
            // 3. Generate invoice number
            const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            
            // 4. Create invoice record
            const invoiceId = require('uuid').v4();
            await client.query(`
                INSERT INTO invoices (
                    invoice_id, customer_id, invoice_number,
                    invoice_date, due_date, subtotal, tax,
                    total, balance, status, payment_terms,
                    created_at
                ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $7, 'pending', $8, NOW())
                RETURNING *
            `, [
                invoiceId,
                customer_id,
                invoiceNumber,
                due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                subtotal,
                tax,
                total,
                terms
            ]);
            
            // 5. Create invoice items
            for (const item of invoiceItems) {
                await client.query(`
                    INSERT INTO invoice_items (
                        invoice_item_id, invoice_id, product_id,
                        sku, description, quantity, unit_price,
                        total, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                `, [
                    require('uuid').v4(),
                    invoiceId,
                    item.product_id,
                    item.sku,
                    item.description,
                    item.quantity,
                    item.unit_price,
                    item.total
                ]);
            }
            
            // 6. Update ${TABLE.customers} balance
            await client.query(`
                UPDATE ${TABLE.customers} 
                SET 
                    total_invoiced = total_invoiced + $1,
                    balance = balance + $1,
                    updated_at = NOW()
                WHERE customer_id = $2
            `, [total, customer_id]);
            
            await client.query('COMMIT');
            
            return {
                invoice_id: invoiceId,
                invoice_number: invoiceNumber,
                customer: {
                    id: customer_id,
                    name: customer.name,
                    class: customer.class
                },
                totals: {
                    subtotal,
                    tax,
                    total,
                    balance: total
                },
                items: invoiceItems,
                due_date: due_date,
                status: 'pending'
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating invoice:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    // =============== INVOICE QUERIES ===============
    
    async getCustomerInvoices(customerId) {
        try {
            const result = await db.query(`
                SELECT 
                    i.*,
                    c.name as customer_name,
                    c.class,
                    c.parent_name
                FROM invoices i
                LEFT JOIN ${TABLE.customers} c ON i.customer_id = c.customer_id
                WHERE i.customer_id = $1
                ORDER BY i.invoice_date DESC
            `, [customerId]);
            
            return result.rows;
        } catch (error) {
            console.error('Error getting customer invoices:', error);
            throw error;
        }
    }
    
    async getInvoiceDetails(invoiceId) {
        try {
            // Get invoice
            const invoiceResult = await db.query(`
                SELECT 
                    i.*,
                    c.name as customer_name,
                    c.class,
                    c.parent_name,
                    c.parent_phone,
                    c.guardian_address
                FROM invoices i
                LEFT JOIN ${TABLE.customers} c ON i.customer_id = c.customer_id
                WHERE i.invoice_id = $1
            `, [invoiceId]);
            
            if (invoiceResult.rows.length === 0) {
                throw new Error('Invoice not found');
            }
            
            const invoice = invoiceResult.rows[0];
            
            // Get invoice items
            const itemsResult = await db.query(`
                SELECT * FROM invoice_items 
                WHERE invoice_id = $1
                ORDER BY created_at
            `, [invoiceId]);
            
            // Get payments against this invoice
            const paymentsResult = await db.query(`
                SELECT * FROM ${TABLE.payments} 
                WHERE invoice_id = $1
                ORDER BY date DESC
            `, [invoiceId]);
            
            return {
                invoice: invoice,
                items: itemsResult.rows,
                payments: paymentsResult.rows,
                summary: {
                    total_items: itemsResult.rows.length,
                    total_payments: paymentsResult.rows.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
                    remaining_balance: parseFloat(invoice.balance) || 0
                }
            };
            
        } catch (error) {
            console.error('Error getting invoice details:', error);
            throw error;
        }
    }
    
    // =============== INVOICE TEMPLATES ===============
    
    getInvoiceTemplate(type = 'standard') {
        const templates = {
            standard: {
                header: `
                    <div class="invoice-header">
                        <h1>INVOICE</h1>
                        <div class="school-info">
                            <h2>STEADYMONITOR SCHOOL</h2>
                            <p>School Supplies & Uniforms</p>
                            <p>Accounts Department</p>
                        </div>
                    </div>
                `,
                customer_section: `
                    <div class="customer-section">
                        <h3>BILL TO:</h3>
                        <p>{customer_name}</p>
                        <p>Class: {customer_class}</p>
                        <p>Parent: {parent_name}</p>
                        <p>Phone: {parent_phone}</p>
                    </div>
                `,
                items_table: `
                    <table class="invoice-items">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items_rows}
                        </tbody>
                    </table>
                `,
                totals_section: `
                    <div class="totals-section">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span>KES {subtotal}</span>
                        </div>
                        <div class="total-row">
                            <span>Tax (0%):</span>
                            <span>KES {tax}</span>
                        </div>
                        <div class="total-row grand-total">
                            <span>GRAND TOTAL:</span>
                            <span>KES {total}</span>
                        </div>
                        <div class="total-row balance">
                            <span>BALANCE DUE:</span>
                            <span>KES {balance}</span>
                        </div>
                    </div>
                `,
                footer: `
                    <div class="invoice-footer">
                        <p><strong>Payment Terms:</strong> {payment_terms}</p>
                        <p><strong>Due Date:</strong> {due_date}</p>
                        <p><strong>Payment Methods:</strong> Cash, M-Pesa, Bank Transfer</p>
                        <p><strong>M-Pesa Paybill:</strong> 123456 • Account: {invoice_number}</p>
                        <p class="notes"><strong>Notes:</strong> {notes}</p>
                    </div>
                `
            },
            
            thermal: {
                // Simplified for 80mm printer
                template: `
HATTYJOHNS INVESTMENTS
P.o box 700-00232,
Ruiru, Kenya.
cell: 0748 920 802 
      0720 435 293

INVOICE
{invoice_number}
Date: {invoice_date}
Due: {due_date}

BILL TO:
{customer_name}
Class: {customer_class}
Parent: {parent_name}

ITEMS:
{items_list}

SUBTOTAL: KES {subtotal}
TAX (0%): KES {tax}
TOTAL: KES {total}
BALANCE: KES {balance}

Payment: {payment_terms}
M-Pesa: 247247 • Acc: {invoice_number}

Thank you!
                `
            }
        };
        
        return templates[type] || templates.standard;
    }
}

module.exports = new InvoiceService();