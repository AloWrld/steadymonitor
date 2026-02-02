// backend/services/printService.js
const db = require('../config/database');

const TABLE = require('../config/table-map');
class PrintService {
    // =============== THERMAL PRINTER FORMATTING (80mm) ===============
    
    formatForThermalPrinter(receiptData, printerSettings = {}) {
        const settings = {
            lineWidth: 42, // 80mm thermal paper (42 chars)
            lineChar: '-',
            boldChar: '*',
            fontSize: 'normal', // normal, small, large
            includeBarcode: true,
            includeFooter: true,
            ...printerSettings
        };

        const lines = [];
        
        // HEADER
        lines.push(this.centerText('HATTYJOHNS INVESTMENTS', settings.lineWidth));
        lines.push(this.centerText('P.O BOX 700-00232, RUIRU', settings.lineWidth));
        lines.push(this.centerText('CELL: 0748 920 802', settings.lineWidth));
        lines.push(this.centerText('0720 435 293', settings.lineWidth));
        lines.push(this.centerText('hattyjohn@gmail.com', settings.lineWidth));
        
        // RECEIPT INFO
        lines.push(`Receipt: ${receiptData.receipt_number}`);
        lines.push(`Date: ${new Date(receiptData.date).toLocaleString()}`);
        lines.push(`Cashier: ${receiptData.served_by}`);
        lines.push(`Dept: ${receiptData.department}`);
        lines.push(''.padEnd(settings.lineWidth, settings.lineChar));
        
        // CUSTOMER INFO (if not walk-in)
        if (receiptData.customer_name && receiptData.customer_name !== 'Walk-in') {
            lines.push(`Customer: ${receiptData.customer_name}`);
            if (receiptData.customer_class) {
                lines.push(`Class: ${receiptData.customer_class}`);
            }
            if (receiptData.parent_name) {
                lines.push(`Parent: ${receiptData.parent_name}`);
            }
            lines.push(''.padEnd(settings.lineWidth, '-'));
        }
        
        // ITEMS TABLE HEADER
        lines.push(this.formatLine('Item', 'Qty', 'Price', 'Total', settings.lineWidth));
        lines.push(''.padEnd(settings.lineWidth, '-'));
        
        // ITEMS
        receiptData.items.forEach(item => {
            const name = item.product_name.length > 20 
                ? item.product_name.substring(0, 17) + '...' 
                : item.product_name;
            
            lines.push(this.formatLine(
                name,
                item.quantity.toString(),
                `KES ${item.unit_price.toFixed(2)}`,
                `KES ${(item.quantity * item.unit_price).toFixed(2)}`,
                settings.lineWidth
            ));
            
            // Add SKU in small font if enabled
            if (settings.showSku) {
                lines.push(`  SKU: ${item.sku}`.padEnd(settings.lineWidth));
            }
        });
        
        lines.push(''.padEnd(settings.lineWidth, settings.lineChar));
        
        // TOTALS
        lines.push('TOTAL'.padEnd(30) + `KES ${receiptData.totals.total.toFixed(2)}`.padStart(12));
        lines.push('PAID'.padEnd(30) + `KES ${receiptData.totals.paid.toFixed(2)}`.padStart(12));
        
        if (receiptData.totals.balance > 0) {
            lines.push('BALANCE'.padEnd(30) + `KES ${receiptData.totals.balance.toFixed(2)}`.padStart(12));
        }
        
        if (receiptData.totals.discount > 0) {
            lines.push('DISCOUNT'.padEnd(30) + `KES ${receiptData.totals.discount.toFixed(2)}`.padStart(12));
        }
        
        lines.push(''.padEnd(settings.lineWidth, settings.lineChar));
        
        // PAYMENT INFO
        lines.push(`Payment: ${receiptData.payment_method.toUpperCase()}`);
        if (receiptData.payment_reference) {
            lines.push(`Ref: ${receiptData.payment_reference}`);
        }
        
        // FOOTER
        if (settings.includeFooter) {
            lines.push(''.padEnd(settings.lineWidth, settings.lineChar));
            lines.push(this.centerText('Thank you for your business!', settings.lineWidth));
            lines.push(this.centerText('Returns within 7 days with receipt', settings.lineWidth));
            lines.push(this.centerText('www.steadymonitor.edu', settings.lineWidth));
        }
        
        // BARCODE (if enabled)
        if (settings.includeBarcode && receiptData.receipt_number) {
            lines.push(''.padEnd(settings.lineWidth, ' '));
            lines.push(this.centerText(`*${receiptData.receipt_number}*`, settings.lineWidth));
        }
        
        // CUT COMMAND (for automatic cut)
        lines.push('\x1B\x69'); // ESC i - Partial cut
        lines.push('\x1B\x40'); // ESC @ - Initialize
        
        return lines.join('\n');
    }
    
    // =============== INVOICE GENERATION ===============
    
    async generateInvoice(customerId, invoicePeriod = 'current') {
        try {
            // Get customer with outstanding balance
            const customerResult = await db.query(`
                SELECT * FROM ${TABLE.customers} 
                WHERE customer_id = $1 AND balance > 0`,
                [customerId]
            );
            
            if (customerResult.rows.length === 0) {
                throw new Error('Customer not found or no balance');
            }
            
            const customer = customerResult.rows[0];
            
            // Get unpaid transactions
            const transactionsResult = await db.query(`
                SELECT 
                    s.sale_id,
                    s.date,
                    s.department,
                    s.total,
                    s.paid,
                    s.balance,
                    s.sale_type,
                    json_agg(
                        json_build_object(
                            'product_name', si.product_name,
                            'quantity', si.qty,
                            'unit_price', si.unit_price
                        )
                    ) as items
                FROM ${TABLE.sales} s
                LEFT JOIN ${TABLE.sale_items} si ON s.sale_id = si.sale_id
                WHERE s.customer_id = $1 
                  AND s.balance > 0
                  AND s.status = 'completed'
                GROUP BY s.sale_id, s.date, s.department, s.total, 
                         s.paid, s.balance, s.sale_type
                ORDER BY s.date
            `, [customerId]);
            
            const transactions = transactionsResult.rows;
            const totalBalance = transactions.reduce((sum, t) => sum + parseFloat(t.balance || 0), 0);
            
            // Generate invoice number
            const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            
            const invoiceData = {
                invoice_number: invoiceNumber,
                invoice_date: new Date().toISOString(),
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                customer: {
                    id: customer.customer_id,
                    name: customer.name,
                    class: customer.class,
                    parent_name: customer.parent_name,
                    parent_phone: customer.parent_phone,
                    address: customer.guardian_address
                },
                transactions: transactions,
                summary: {
                    total_items: transactions.length,
                    total_amount: totalBalance,
                    tax_amount: totalBalance * 0.00,
                    grand_total: totalBalance * 1.00
                },
                payment_terms: 'Payment due within 30 days',
                notes: 'Please pay at the school accounts office or via M-Pesa Paybill'
            };
            
            return invoiceData;
            
        } catch (error) {
            console.error('Error generating invoice:', error);
            throw error;
        }
    }
    
    // =============== HELPER METHODS ===============
    
    centerText(text, width) {
        const padding = Math.max(0, Math.floor((width - text.length) / 2));
        return ' '.repeat(padding) + text;
    }
    
    formatLine(item, qty, price, total, width) {
        const itemWidth = Math.floor(width * 0.4);
        const qtyWidth = Math.floor(width * 0.1);
        const priceWidth = Math.floor(width * 0.2);
        const totalWidth = Math.floor(width * 0.3);
        
        const itemPart = item.padEnd(itemWidth).substring(0, itemWidth);
        const qtyPart = qty.padStart(qtyWidth).substring(0, qtyWidth);
        const pricePart = price.padStart(priceWidth).substring(0, priceWidth);
        const totalPart = total.padStart(totalWidth).substring(0, totalWidth);
        
        return itemPart + qtyPart + pricePart + totalPart;
    }
    
    // =============== PRINT SETTINGS ===============
    
    getPrinterSettings(printerType = 'default') {
        const settings = {
            default: {
                lineWidth: 42,
                fontSize: 'normal',
                includeBarcode: true,
                includeFooter: true,
                showSku: false,
                autoCut: true
            },
            detailed: {
                lineWidth: 42,
                fontSize: 'small',
                includeBarcode: true,
                includeFooter: true,
                showSku: true,
                autoCut: true
            },
            simple: {
                lineWidth: 42,
                fontSize: 'normal',
                includeBarcode: false,
                includeFooter: false,
                showSku: false,
                autoCut: false
            }
        };
        
        return settings[printerType] || settings.default;
    }
    
    // =============== BATCH PRINTING ===============
    
    async printMultipleReceipts(receiptIds, printerType = 'default') {
        const receipts = [];
        
        for (const receiptId of receiptIds) {
            try {
                const receiptData = await this.getReceiptData(receiptId);
                const formatted = this.formatForThermalPrinter(receiptData, this.getPrinterSettings(printerType));
                receipts.push({
                    receipt_id: receiptId,
                    formatted: formatted,
                    success: true
                });
            } catch (error) {
                receipts.push({
                    receipt_id: receiptId,
                    error: error.message,
                    success: false
                });
            }
        }
        
        return receipts;
    }
    
    async getReceiptData(receiptId) {
        // Get receipt data from database
        const result = await db.query(`
            SELECT 
                s.sale_id as receipt_number,
                s.date,
                s.served_by,
                s.department,
                s.customer_id,
                s.total,
                s.paid,
                s.balance,
                s.payment_mode as payment_method,
                s.discount_amount,
                c.name as customer_name,
                c.class as customer_class,
                c.parent_name,
                json_agg(
                    json_build_object(
                        'product_name', si.product_name,
                        'sku', si.sku,
                        'quantity', si.qty,
                        'unit_price', si.unit_price
                    )
                ) as items
            FROM ${TABLE.sales} s
            LEFT JOIN ${TABLE.customers} c ON s.customer_id = c.customer_id
            LEFT JOIN ${TABLE.sale_items} si ON s.sale_id = si.sale_id
            WHERE s.sale_id = $1
            GROUP BY s.sale_id, s.date, s.served_by, s.department, 
                     s.customer_id, s.total, s.paid, s.balance,
                     s.payment_mode, s.discount_amount,
                     c.name, c.class, c.parent_name
        `, [receiptId]);
        
        if (result.rows.length === 0) {
            throw new Error('Receipt not found');
        }
        
        const data = result.rows[0];
        
        return {
            receipt_number: data.receipt_number,
            date: data.date,
            served_by: data.served_by,
            department: data.department,
            customer_name: data.customer_name || 'Walk-in',
            customer_class: data.customer_class,
            parent_name: data.parent_name,
            items: data.items || [],
            totals: {
                total: parseFloat(data.total) || 0,
                paid: parseFloat(data.paid) || 0,
                balance: parseFloat(data.balance) || 0,
                discount: parseFloat(data.discount_amount) || 0
            },
            payment_method: data.payment_method,
            payment_reference: `REF-${data.receipt_number.substr(-8)}`
        };
    }
}

module.exports = new PrintService();