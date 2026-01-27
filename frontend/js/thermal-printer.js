// frontend/js/thermal-printer.js
class ThermalPrinter {
    constructor(options = {}) {
        this.options = {
            lineWidth: 42,
            fontSize: 'normal',
            autoCut: true,
            ...options
        };
        
        this.esc = {
            INIT: '\x1B\x40',
            CUT: '\x1B\x69',
            BOLD_ON: '\x1B\x45',
            BOLD_OFF: '\x1B\x46',
            UNDERLINE_ON: '\x1B\x2D\x01',
            UNDERLINE_OFF: '\x1B\x2D\x00',
            ALIGN_CENTER: '\x1B\x61\x01',
            ALIGN_LEFT: '\x1B\x61\x00',
            ALIGN_RIGHT: '\x1B\x61\x02'
        };
    }
    
    // Print to connected thermal printer
    async printToDevice(formattedText) {
        try {
            // Check for WebUSB API support
            if ('usb' in navigator) {
                await this.printViaWebUSB(formattedText);
            } 
            // Check for Web Serial API support
            else if ('serial' in navigator) {
                await this.printViaWebSerial(formattedText);
            }
            // Fallback to window.print() for HTML
            else {
                this.printViaHTML(formattedText);
            }
            
            return true;
        } catch (error) {
            console.error('Print error:', error);
            throw error;
        }
    }
    
    // Print via WebUSB (for USB thermal printers)
    async printViaWebUSB(text) {
        const device = await navigator.usb.requestDevice({
            filters: [{ vendorId: 0x0416 }] // Common thermal printer vendor IDs
        });
        
        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);
        
        const encoder = new TextEncoder();
        const data = encoder.encode(this.esc.INIT + text + (this.options.autoCut ? this.esc.CUT : ''));
        
        await device.transferOut(1, data);
        await device.close();
    }
    
    // Print via Web Serial (for serial thermal printers)
    async printViaWebSerial(text) {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        
        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();
        const data = encoder.encode(this.esc.INIT + text + (this.options.autoCut ? this.esc.CUT : ''));
        
        await writer.write(data);
        writer.releaseLock();
        await port.close();
    }
    
    // Fallback: Print via HTML (opens print dialog)
    printViaHTML(text) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Receipt</title>
                <style>
                    @media print {
                        body {
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            width: 80mm;
                            margin: 0;
                            padding: 0;
                        }
                        .receipt {
                            width: 80mm;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        }
                    }
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                </style>
            </head>
            <body>
                <div class="receipt">${text.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}</div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => window.close(), 1000);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
    
    // Format receipt for display preview
    formatForPreview(formattedText) {
        return `
            <div class="thermal-preview" style="
                font-family: 'Courier New', monospace;
                font-size: 12px;
                width: 80mm;
                background: white;
                padding: 10px;
                border: 1px solid #ccc;
                white-space: pre-wrap;
                word-wrap: break-word;
                margin: 20px auto;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            ">
                ${formattedText.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}
            </div>
        `;
    }
    
    // Generate barcode for receipt number
    generateBarcode(receiptNumber) {
        // Simple barcode using asterisks (real implementation would use a barcode library)
        const barcode = `*${receiptNumber}*`;
        const padding = Math.floor((this.options.lineWidth - barcode.length) / 2);
        return ' '.repeat(padding) + barcode;
    }
}

// Usage example:
// const printer = new ThermalPrinter({ autoCut: true });
// const receipt = await fetch('/api/print/receipt', { method: 'POST', body: { receipt_id: '123' } });
// await printer.printToDevice(receipt.formatted);