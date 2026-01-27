// backend/routes/printRoutes.js
const express = require('express');
const router = express.Router();
const printService = require('../services/printService');
const invoiceService = require('../services/invoiceService');
const { requirePermission } = require('../middleware/authMiddleware');

/**
 * 1. PRINT RECEIPT (Thermal 80mm)
 * Route: POST /api/print/receipt
 */
router.post('/receipt', requirePermission('print'), async (req, res) => {
    try {
        const { receipt_id, printer_type = 'default' } = req.body;
        
        if (!receipt_id) {
            return res.status(400).json({
                success: false,
                message: 'Receipt ID is required'
            });
        }
        
        console.log(`🖨️  Printing receipt: ${receipt_id} for ${req.user?.displayName || 'Unknown'}`);
        
        // Get receipt data
        const receiptData = await printService.getReceiptData(receipt_id);
        
        // Format for thermal printer
        const formattedReceipt = printService.formatForThermalPrinter(
            receiptData, 
            printService.getPrinterSettings(printer_type)
        );
        
        res.json({
            success: true,
            receipt_id: receipt_id,
            formatted: formattedReceipt,
            raw_data: receiptData,
            printer_settings: printService.getPrinterSettings(printer_type),
            print_commands: {
                cut: '\x1B\x69', // ESC i
                init: '\x1B\x40', // ESC @
                line_feed: '\n',
                bold_on: '\x1B\x45', // ESC E
                bold_off: '\x1B\x46'  // ESC F
            }
        });
        
    } catch (error) {
        console.error('❌ Print receipt error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to format receipt for printing',
            error: error.message
        });
    }
});

/**
 * 2. GENERATE INVOICE
 * Route: POST /api/print/invoice
 */
router.post('/invoice', requirePermission('print'), async (req, res) => {
    try {
        const { customer_id, items, due_date, notes, terms } = req.body;
        
        if (!customer_id || !items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Customer ID and items are required'
            });
        }
        
        const userInfo = {
            userName: req.user?.displayName || 'System'
        };
        
        console.log(`📄 Generating invoice for customer: ${customer_id}`);
        
        const invoice = await invoiceService.createInvoice({
            customer_id,
            items,
            due_date,
            notes,
            terms: terms || 'Net 30'
        }, userInfo);
        
        res.json({
            success: true,
            message: 'Invoice generated successfully',
            invoice: invoice,
            printable: true,
            template: invoiceService.getInvoiceTemplate('standard')
        });
        
    } catch (error) {
        console.error('❌ Generate invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate invoice',
            error: error.message
        });
    }
});

/**
 * 3. GET INVOICE DETAILS
 * Route: GET /api/print/invoice/:invoiceId
 */
router.get('/invoice/:invoiceId', requirePermission('print'), async (req, res) => {
    try {
        const { invoiceId } = req.params;
        
        console.log(`📋 Getting invoice details: ${invoiceId}`);
        
        const invoiceDetails = await invoiceService.getInvoiceDetails(invoiceId);
        
        // Format for thermal printer if requested
        const { format } = req.query;
        if (format === 'thermal') {
            const thermalTemplate = invoiceService.getInvoiceTemplate('thermal');
            let thermalOutput = thermalTemplate.template;
            
            // Replace placeholders
            thermalOutput = thermalOutput
                .replace('{invoice_number}', invoiceDetails.invoice.invoice_number)
                .replace('{invoice_date}', new Date(invoiceDetails.invoice.invoice_date).toLocaleDateString())
                .replace('{due_date}', new Date(invoiceDetails.invoice.due_date).toLocaleDateString())
                .replace('{customer_name}', invoiceDetails.invoice.customer_name)
                .replace('{customer_class}', invoiceDetails.invoice.class || 'N/A')
                .replace('{parent_name}', invoiceDetails.invoice.parent_name || 'N/A')
                .replace('{subtotal}', invoiceDetails.invoice.subtotal.toFixed(2))
                .replace('{tax}', invoiceDetails.invoice.tax.toFixed(2))
                .replace('{total}', invoiceDetails.invoice.total.toFixed(2))
                .replace('{balance}', invoiceDetails.invoice.balance.toFixed(2))
                .replace('{payment_terms}', invoiceDetails.invoice.payment_terms || 'Net 30');
            
            // Format items list
            let itemsList = '';
            invoiceDetails.items.forEach(item => {
                itemsList += `${item.description.substring(0, 30)} x${item.quantity} KES ${item.unit_price.toFixed(2)}\n`;
            });
            thermalOutput = thermalOutput.replace('{items_list}', itemsList);
            
            invoiceDetails.thermal_format = thermalOutput;
        }
        
        res.json({
            success: true,
            ...invoiceDetails
        });
        
    } catch (error) {
        console.error('❌ Get invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get invoice',
            error: error.message
        });
    }
});

/**
 * 4. BATCH PRINT RECEIPTS
 * Route: POST /api/print/batch
 */
router.post('/batch', requirePermission('print'), async (req, res) => {
    try {
        const { receipt_ids, printer_type = 'default' } = req.body;
        
        if (!receipt_ids || !Array.isArray(receipt_ids) || receipt_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Receipt IDs array is required'
            });
        }
        
        console.log(`🖨️  Batch printing ${receipt_ids.length} receipts`);
        
        const results = await printService.printMultipleReceipts(receipt_ids, printer_type);
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        res.json({
            success: true,
            total: receipt_ids.length,
            successful: successful.length,
            failed: failed.length,
            results: results,
            summary: {
                can_print_all: failed.length === 0,
                formatted_receipts: successful.map(r => r.formatted)
            }
        });
        
    } catch (error) {
        console.error('❌ Batch print error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to batch print receipts',
            error: error.message
        });
    }
});

/**
 * 5. GET PRINTER SETTINGS
 * Route: GET /api/print/settings
 */
router.get('/settings', requirePermission('print'), (req, res) => {
    const { printer_type } = req.query;
    
    const settings = printService.getPrinterSettings(printer_type);
    
    res.json({
        success: true,
        printer_type: printer_type || 'default',
        settings: settings,
        available_types: ['default', 'detailed', 'simple'],
        thermal_specs: {
            paper_width: '80mm',
            max_chars_per_line: 42,
            supported_commands: ['ESC/P', 'ESC/POS'],
            barcode_support: true,
            auto_cutter: true
        }
    });
});
// Add these endpoints to your existing printRoutes.js or create new routes

/**
 * 6. GET INVOICES LIST
 * Route: GET /api/invoices
 */
router.get('/invoices', requirePermission('print'), async (req, res) => {
    try {
        const { status, customer_id, date_from, date_to } = req.query;
        
        let query = `
            SELECT 
                i.invoice_id,
                i.invoice_number,
                i.invoice_date,
                i.due_date,
                i.customer_id,
                i.total,
                i.paid,
                i.balance,
                i.status,
                i.payment_terms,
                i.notes,
                c.name as customer_name,
                c.class,
                c.parent_name,
                c.parent_phone
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.customer_id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 0;
        
        if (status && status !== 'all') {
            paramCount++;
            query += ` AND i.status = $${paramCount}`;
            params.push(status);
        }
        
        if (customer_id && customer_id !== 'all') {
            paramCount++;
            query += ` AND i.customer_id = $${paramCount}`;
            params.push(customer_id);
        }
        
        if (date_from) {
            paramCount++;
            query += ` AND i.invoice_date >= $${paramCount}`;
            params.push(date_from);
        }
        
        if (date_to) {
            paramCount++;
            query += ` AND i.invoice_date <= $${paramCount}`;
            params.push(date_to);
        }
        
        query += ` ORDER BY i.invoice_date DESC`;
        
        const result = await db.query(query, params);
        
        res.json({
            success: true,
            count: result.rows.length,
            invoices: result.rows
        });
        
    } catch (error) {
        console.error('❌ Get invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoices',
            error: error.message
        });
    }
});

module.exports = router;