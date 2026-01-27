// backend/services/reportService.js
const db = require('../config/database');
const ExcelJS = require('exceljs'); const TABLE = require('../config/table-map');
// More stable than xlsx
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class ReportService {
    
    // ==================== HELPER FUNCTIONS ====================
    
    /**
     * Filter data by date range (using created_at field)
     */
    async filterByDateRange(tableName, startDate, endDate) {
        let query = `SELECT * FROM ${tableName} WHERE 1=1`;
        const params = [];
        
        if (startDate) {
            query += ` AND created_at >= $${params.length + 1}`;
            params.push(startDate);
        }
        
        if (endDate) {
            query += ` AND created_at <= $${params.length + 1}`;
            params.push(`${endDate}T23:59:59.999Z`);
        }
        
        const result = await db.query(query, params);
        return result.rows;
    }
    
    /**
     * Get date range for reports (default: last 1 year)
     */
    getDefaultDateRange() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        
        return {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
        };
    }
    
    /**
     * Check if data is older than 1 year for notification
     */
    async checkOldDataNotification() {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        // Check sales older than 1 year
        const oldSales = await db.query(
            `SELECT COUNT(*) as count FROM ${TABLE.sales} WHERE created_at < $1`,
            [oneYearAgo]
        );
        
        // Check other tables
        const oldCustomers = await db.query(
            `SELECT COUNT(*) as count FROM ${TABLE.customers} WHERE created_at < $1`,
            [oneYearAgo]
        );
        
        const totalOldRecords = parseInt(oldSales.rows[0].count) + parseInt(oldCustomers.rows[0].count);
        
        return {
            has_old_data: totalOldRecords > 0,
            old_sales_count: parseInt(oldSales.rows[0].count),
            old_customers_count: parseInt(oldCustomers.rows[0].count),
            total_old_records: totalOldRecords,
            message: totalOldRecords > 0 ? 
                `You have ${totalOldRecords} records older than 1 year. Consider archiving.` : 
                'All data is within 1 year range.'
        };
    }
    
    // ==================== SALES REPORTS ====================
    
    /**
     * Sales report with filters
     */
    async getSalesReport(filters = {}) {
        try {
            const {
                start_date,
                end_date,
                department,
                payment_mode,
                program_type
            } = filters;
            
            // Build query
            let query = `
                SELECT 
                    s.sale_id,
                    s.date,
                    s.department,
                    s.served_by,
                    s.customer_id,
                    s.customer_type,
                    s.payment_mode,
                    s.total,
                    s.paid,
                    s.balance,
                    s.status,
                    s.sale_type,
                    s.created_at,
                    c.name as customer_name,
                    c.class as customer_class,
                    c.boarding_status,
                    c.program_membership
                FROM ${TABLE.sales} s
                LEFT JOIN ${TABLE.customers} c ON s.customer_id = c.customer_id
                WHERE 1=1
            `;
            
            const params = [];
            let paramCount = 0;
            
            // Date filter
            if (start_date) {
                paramCount++;
                query += ` AND s.created_at >= $${paramCount}`;
                params.push(start_date);
            }
            
            if (end_date) {
                paramCount++;
                query += ` AND s.created_at <= $${paramCount}`;
                params.push(`${end_date}T23:59:59.999Z`);
            }
            
            // Department filter
            if (department && department !== 'all') {
                paramCount++;
                query += ` AND s.department = $${paramCount}`;
                params.push(department);
            }
            
            // Payment mode filter
            if (payment_mode && payment_mode !== 'all') {
                paramCount++;
                query += ` AND s.payment_mode = $${paramCount}`;
                params.push(payment_mode);
            }
            
            query += ` ORDER BY s.created_at DESC LIMIT 1000`;
            
            // Execute query
            const result = await db.query(query, params);
            const sales = result.rows;
            
            // Get sale items for totals
            const saleIds = sales.map(s => s.sale_id);
            let saleItems = [];
            
            if (saleIds.length > 0) {
                const itemsResult = await db.query(
                    `SELECT * FROM ${TABLE.sale_items} WHERE sale_id = ANY($1)`,
                    [saleIds]
                );
                saleItems = itemsResult.rows;
            }
            
            // Filter by program type (if specified)
            let filteredSales = sales;
            if (program_type && program_type !== 'all') {
                filteredSales = sales.filter(sale => {
                    if (program_type === 'learner' && sale.customer_type === 'learner') {
                        return true;
                    }
                    if (program_type === 'walkin' && sale.customer_type === 'walkin') {
                        return true;
                    }
                    if (program_type === 'A' && sale.program_membership === 'A') {
                        return true;
                    }
                    if (program_type === 'B' && sale.program_membership === 'B') {
                        return true;
                    }
                    if (program_type === 'pocket_money' && sale.sale_type === 'pocket_money') {
                        return true;
                    }
                    return false;
                });
            }
            
            // Calculate totals
            const totals = filteredSales.reduce((acc, sale) => {
                acc.total_sales += parseFloat(sale.total) || 0;
                acc.total_paid += parseFloat(sale.paid) || 0;
                acc.total_balance += parseFloat(sale.balance) || 0;
                return acc;
            }, { total_sales: 0, total_paid: 0, total_balance: 0 });
            
            // Group by payment mode
            const byPaymentMode = {};
            filteredSales.forEach(sale => {
                const mode = sale.payment_mode || 'Unknown';
                if (!byPaymentMode[mode]) {
                    byPaymentMode[mode] = { count: 0, total: 0, paid: 0, balance: 0 };
                }
                byPaymentMode[mode].count++;
                byPaymentMode[mode].total += parseFloat(sale.total) || 0;
                byPaymentMode[mode].paid += parseFloat(sale.paid) || 0;
                byPaymentMode[mode].balance += parseFloat(sale.balance) || 0;
            });
            
            // Group by department
            const byDepartment = {};
            filteredSales.forEach(sale => {
                const dept = sale.department || 'Unknown';
                if (!byDepartment[dept]) {
                    byDepartment[dept] = { count: 0, total: 0 };
                }
                byDepartment[dept].count++;
                byDepartment[dept].total += parseFloat(sale.total) || 0;
            });
            
            // Group by program
            const byProgram = {};
            filteredSales.forEach(sale => {
                const program = sale.program_membership || 
                              (sale.customer_type === 'walkin' ? 'walkin' : 
                               sale.sale_type === 'pocket_money' ? 'pocket_money' : 'none');
                if (!byProgram[program]) {
                    byProgram[program] = { count: 0, total: 0 };
                }
                byProgram[program].count++;
                byProgram[program].total += parseFloat(sale.total) || 0;
            });
            
            return {
                success: true,
                period: { start_date, end_date },
                summary: {
                    total_transactions: filteredSales.length,
                    ...totals,
                    learner_transactions: filteredSales.filter(s => s.customer_type === 'learner').length,
                    walkin_transactions: filteredSales.filter(s => s.customer_type === 'walkin').length,
                    program_a_transactions: filteredSales.filter(s => s.program_membership === 'A').length,
                    program_b_transactions: filteredSales.filter(s => s.program_membership === 'B').length,
                    pocket_money_transactions: filteredSales.filter(s => s.sale_type === 'pocket_money').length
                },
                breakdown: {
                    by_payment_mode: byPaymentMode,
                    by_department: byDepartment,
                    by_program: byProgram
                },
                sales: filteredSales.map(sale => ({
                    sale_id: sale.sale_id,
                    date: sale.date,
                    department: sale.department,
                    customer_id: sale.customer_id,
                    customer_name: sale.customer_name,
                    customer_type: sale.customer_type,
                    program_membership: sale.program_membership,
                    payment_mode: sale.payment_mode,
                    total: parseFloat(sale.total) || 0,
                    paid: parseFloat(sale.paid) || 0,
                    balance: parseFloat(sale.balance) || 0,
                    served_by: sale.served_by,
                    items: saleItems.filter(item => item.sale_id === sale.sale_id)
                }))
            };
            
        } catch (error) {
            console.error('Sales report error:', error);
            throw error;
        }
    }
    
    /**
     * Profit report with allocations cost
     */
    async getProfitReport(filters = {}) {
        try {
            const { start_date, end_date } = filters;
            
            // Get sales in date range
            let salesQuery = `SELECT * FROM ${TABLE.sales} WHERE 1=1`;
            const salesParams = [];
            
            if (start_date) {
                salesQuery += ` AND created_at >= $${salesParams.length + 1}`;
                salesParams.push(start_date);
            }
            
            if (end_date) {
                salesQuery += ` AND created_at <= $${salesParams.length + 1}`;
                salesParams.push(`${end_date}T23:59:59.999Z`);
            }
            
            const salesResult = await db.query(salesQuery, salesParams);
            const sales = salesResult.rows;
            const saleIds = sales.map(s => s.sale_id);
            
            // Get sale items
            let saleItems = [];
            if (saleIds.length > 0) {
                const itemsResult = await db.query(
                    `SELECT * FROM ${TABLE.sale_items} WHERE sale_id = ANY($1)`,
                    [saleIds]
                );
                saleItems = itemsResult.rows;
            }
            
            // Calculate profit
            let totalRevenue = 0;
            let totalCost = 0;
            
            saleItems.forEach(item => {
                totalRevenue += (item.qty || 1) * (parseFloat(item.unit_price) || 0);
                totalCost += (item.qty || 1) * (parseFloat(item.cost_price) || 0);
            });
            
            const totalProfit = totalRevenue - totalCost;
            const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
            
            // Get restocks in same period
            let restocksQuery = `SELECT * FROM ${TABLE.restocks} WHERE 1=1`;
            const restockParams = [];
            
            if (start_date) {
                restocksQuery += ` AND created_at >= $${restockParams.length + 1}`;
                restockParams.push(start_date);
            }
            
            if (end_date) {
                restocksQuery += ` AND created_at <= $${restockParams.length + 1}`;
                restockParams.push(`${end_date}T23:59:59.999Z`);
            }
            
            const restocksResult = await db.query(restocksQuery, restockParams);
            const restocks = restocksResult.rows;
            
            const totalRestockCost = restocks.reduce((sum, r) => sum + (parseFloat(r.total_cost) || 0), 0);
            const totalExpectedProfit = restocks.reduce((sum, r) => sum + (parseFloat(r.expected_profit) || 0), 0);
            
            // Get allocation history for cost calculation
            let allocationQuery = `SELECT * FROM ${TABLE.allocation_history} WHERE 1=1`;
            const allocParams = [];
            
            if (start_date) {
                allocationQuery += ` AND created_at >= $${allocParams.length + 1}`;
                allocParams.push(start_date);
            }
            
            if (end_date) {
                allocationQuery += ` AND created_at <= $${allocParams.length + 1}`;
                allocParams.push(`${end_date}T23:59:59.999Z`);
            }
            
            const allocationResult = await db.query(allocationQuery, allocParams);
            const allocationHistory = allocationResult.rows;
            
            // Calculate allocation costs (items given for free)
            const allocationItemsCost = allocationHistory.reduce((total, allocation) => {
                if (allocation.is_pocket_money) return total; // Pocket money already accounted in sales
                
                const cost = parseFloat(allocation.cost_price) || 0;
                const quantity = parseInt(allocation.quantity) || 1;
                return total + (cost * quantity);
            }, 0);
            
            return {
                success: true,
                period: { start_date, end_date },
                financial_summary: {
                    total_revenue: totalRevenue,
                    total_cost: totalCost,
                    gross_profit: totalProfit,
                    profit_margin_percent: profitMargin.toFixed(2),
                    total_restock_cost: totalRestockCost,
                    total_expected_profit: totalExpectedProfit,
                    allocation_program_cost: allocationItemsCost,
                    net_impact: totalProfit - totalRestockCost - allocationItemsCost
                },
                sales_count: sales.length,
                items_sold: saleItems.reduce((sum, item) => sum + (parseInt(item.qty) || 1), 0),
                allocations_given: allocationHistory.filter(a => !a.is_pocket_money).length,
                allocation_items_count: allocationHistory
                    .filter(a => !a.is_pocket_money)
                    .reduce((sum, alloc) => sum + (parseInt(alloc.quantity) || 1), 0),
                pocket_money_transactions: allocationHistory.filter(a => a.is_pocket_money).length
            };
            
        } catch (error) {
            console.error('Profit report error:', error);
            throw error;
        }
    }
    
    // ==================== INVENTORY REPORTS ====================
    
    /**
     * Inventory valuation report
     */
    async getInventoryReport() {
        try {
            const products = await db.query(
                `SELECT * FROM ${TABLE.products} WHERE active = true ORDER BY department, name`
            );
            
            const valuation = products.rows.reduce((acc, product) => {
                const costValue = (product.stock_qty || 0) * (parseFloat(product.buy_price) || 0);
                const retailValue = (product.stock_qty || 0) * (parseFloat(product.sell_price) || 0);
                const potentialProfit = retailValue - costValue;
                
                acc.total_cost_value += costValue;
                acc.total_retail_value += retailValue;
                acc.total_potential_profit += potentialProfit;
                
                if (product.stock_qty <= (product.reorder_level || 0)) {
                    acc.low_stock_items++;
                    acc.low_stock_value += retailValue;
                }
                
                return acc;
            }, {
                total_cost_value: 0,
                total_retail_value: 0,
                total_potential_profit: 0,
                low_stock_items: 0,
                low_stock_value: 0
            });
            
            // Group by department
            const byDepartment = {};
            products.rows.forEach(product => {
                if (!byDepartment[product.department]) {
                    byDepartment[product.department] = {
                        count: 0,
                        cost_value: 0,
                        retail_value: 0,
                        low_stock: 0
                    };
                }
                byDepartment[product.department].count++;
                byDepartment[product.department].cost_value += (product.stock_qty || 0) * (parseFloat(product.buy_price) || 0);
                byDepartment[product.department].retail_value += (product.stock_qty || 0) * (parseFloat(product.sell_price) || 0);
                
                if (product.stock_qty <= (product.reorder_level || 0)) {
                    byDepartment[product.department].low_stock++;
                }
            });
            
            return {
                success: true,
                generated_at: new Date().toISOString(),
                summary: {
                    total_products: products.rows.length,
                    ...valuation,
                    overall_margin: valuation.total_retail_value > 0 ? 
                        (valuation.total_potential_profit / valuation.total_retail_value * 100).toFixed(2) : 0
                },
                by_department: byDepartment,
                top_products: products.rows
                    .sort((a, b) => ((b.stock_qty || 0) * (parseFloat(b.sell_price) || 0)) - 
                                   ((a.stock_qty || 0) * (parseFloat(a.sell_price) || 0)))
                    .slice(0, 10)
                    .map(p => ({
                        product_id: p.product_id,
                        name: p.name,
                        sku: p.sku,
                        department: p.department,
                        stock: p.stock_qty || 0,
                        reorder_level: p.reorder_level || 0,
                        retail_value: (p.stock_qty || 0) * (parseFloat(p.sell_price) || 0),
                        status: (p.stock_qty || 0) <= (p.reorder_level || 0) ? 'LOW' : 'OK'
                    })),
                low_stock_products: products.rows
                    .filter(p => p.stock_qty <= (p.reorder_level || 0))
                    .map(p => ({
                        product_id: p.product_id,
                        name: p.name,
                        sku: p.sku,
                        department: p.department,
                        current_stock: p.stock_qty || 0,
                        reorder_level: p.reorder_level || 0,
                        needed: (p.reorder_level || 0) - (p.stock_qty || 0),
                        supplier: p.supplier_id ? 'Has supplier' : 'No supplier'
                    }))
            };
            
        } catch (error) {
            console.error('Inventory report error:', error);
            throw error;
        }
    }
    
    // ==================== CUSTOMER REPORTS ====================
    
    /**
     * Comprehensive customer/learner report
     */
    async getCustomerReport(filters = {}) {
        try {
            const { program, boarding_status, installment_status, has_balance } = filters;
            
            let query = `SELECT * FROM ${TABLE.customers} WHERE 1=1`;
            const params = [];
            let paramCount = 0;
            
            // Program filter
            if (program && program !== 'all') {
                paramCount++;
                query += ` AND program_membership LIKE $${paramCount}`;
                params.push(`%${program}%`);
            }
            
            // Boarding status filter
            if (boarding_status && boarding_status !== 'all') {
                paramCount++;
                query += ` AND boarding_status = $${paramCount}`;
                params.push(boarding_status);
            }
            
            // Installment status filter
            if (installment_status && installment_status !== 'all') {
                paramCount++;
                query += ` AND installment_status = $${paramCount}`;
                params.push(installment_status);
            }
            
            // Balance filter
            if (has_balance === 'yes') {
                query += ` AND balance > 0`;
            } else if (has_balance === 'no') {
                query += ` AND balance <= 0`;
            }
            
            query += ` ORDER BY class, name`;
            
            const result = await db.query(query, params);
            const customers = result.rows;
            
            // Get additional data
            const customerIds = customers.map(c => c.customer_id);
            
            // Get allocations
            let allocations = [];
            if (customerIds.length > 0) {
                const allocResult = await db.query(
                    `SELECT * FROM ${TABLE.allocations} WHERE customer_id = ANY($1)`,
                    [customerIds]
                );
                allocations = allocResult.rows;
            }
            
            // Get allocation history
            let allocationHistory = [];
            if (customerIds.length > 0) {
                const histResult = await db.query(
                    `SELECT * FROM ${TABLE.allocation_history} WHERE customer_id = ANY($1)`,
                    [customerIds]
                );
                allocationHistory = histResult.rows;
            }
            
            // Get installment payments
            let installmentPayments = [];
            if (customerIds.length > 0) {
                const payResult = await db.query(
                    `SELECT * FROM ${TABLE.installment_payments} WHERE customer_id = ANY($1)`,
                    [customerIds]
                );
                installmentPayments = payResult.rows;
            }
            
            // Get sales for each customer
            let sales = [];
            if (customerIds.length > 0) {
                const salesResult = await db.query(
                    `SELECT * FROM ${TABLE.sales} WHERE customer_id = ANY($1)`,
                    [customerIds]
                );
                sales = salesResult.rows;
            }
            
            // Enrich customer data
            const customersWithStats = customers.map(customer => {
                const customerAllocations = allocations.filter(a => a.customer_id === customer.customer_id);
                const customerAllocationHistory = allocationHistory.filter(h => h.customer_id === customer.customer_id);
                const customerInstallments = installmentPayments.filter(p => p.customer_id === customer.customer_id);
                const customerSales = sales.filter(s => s.customer_id === customer.customer_id);
                
                const pendingAllocations = customerAllocations.filter(a => 
                    !a.last_given_date || 
                    (a.next_due_date && new Date() >= new Date(a.next_due_date))
                );
                
                const totalInstallmentsPaid = customerInstallments.reduce((sum, p) => 
                    sum + (parseFloat(p.amount) || 0), 0
                );
                
                const totalSalesAmount = customerSales.reduce((sum, s) => 
                    sum + (parseFloat(s.total) || 0), 0
                );
                
                return {
                    ...customer,
                    total_allocations: customerAllocations.length,
                    pending_allocations: pendingAllocations.length,
                    allocations_received: customerAllocationHistory.filter(a => !a.is_pocket_money).length,
                    pocket_money_transactions: customerAllocationHistory.filter(a => a.is_pocket_money).length,
                    total_installments_paid: totalInstallmentsPaid,
                    total_sales_amount: totalSalesAmount,
                    sales_count: customerSales.length,
                    last_installment_date: customerInstallments.length > 0 ? 
                        customerInstallments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0]?.payment_date : null,
                    last_sale_date: customerSales.length > 0 ? 
                        customerSales.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date : null
                };
            });
            
            // Calculate statistics
            const stats = {
                total_customers: customersWithStats.length,
                by_program: {},
                by_boarding_status: {},
                by_installment_status: {},
                financial_summary: {
                    total_balance: 0,
                    total_installments_paid: 0,
                    customers_with_balance: 0,
                    total_sales_amount: 0
                },
                allocation_summary: {
                    total_allocations: 0,
                    pending_allocations: 0,
                    allocations_given: 0,
                    pocket_money_transactions: 0
                }
            };
            
            customersWithStats.forEach(customer => {
                // Count by program
                const program = customer.program_membership || 'none';
                const programs = program.split(',').map(p => p.trim());
                programs.forEach(p => {
                    if (!stats.by_program[p]) stats.by_program[p] = 0;
                    stats.by_program[p]++;
                });
                
                // Count by boarding status
                const boarding = customer.boarding_status || 'Day';
                if (!stats.by_boarding_status[boarding]) stats.by_boarding_status[boarding] = 0;
                stats.by_boarding_status[boarding]++;
                
                // Count by installment status
                const installmentStatus = customer.installment_status || 'not_paid';
                if (!stats.by_installment_status[installmentStatus]) stats.by_installment_status[installmentStatus] = 0;
                stats.by_installment_status[installmentStatus]++;
                
                // Financial stats
                const balance = parseFloat(customer.balance) || 0;
                stats.financial_summary.total_balance += balance;
                if (balance > 0) stats.financial_summary.customers_with_balance++;
                stats.financial_summary.total_installments_paid += customer.total_installments_paid || 0;
                stats.financial_summary.total_sales_amount += customer.total_sales_amount || 0;
                
                // Allocation stats
                stats.allocation_summary.total_allocations += customer.total_allocations || 0;
                stats.allocation_summary.pending_allocations += customer.pending_allocations || 0;
                stats.allocation_summary.allocations_given += customer.allocations_received || 0;
                stats.allocation_summary.pocket_money_transactions += customer.pocket_money_transactions || 0;
            });
            
            return {
                success: true,
                generated_at: new Date().toISOString(),
                statistics: stats,
                filters_applied: filters,
                customers: customersWithStats.slice(0, 100), // Limit for performance
                program_descriptions: {
                    'A': 'Allocation Program - Scheduled items',
                    'B': 'Exercise Books & Essentials',
                    'none': 'No special program',
                    'walkin': 'Walk-in customers'
                }
            };
            
        } catch (error) {
            console.error('Customer report error:', error);
            throw error;
        }
    }
    
    // ==================== ALLOCATION REPORTS ====================
    
    /**
     * Allocation program report
     */
    async getAllocationReport(filters = {}) {
        try {
            const { start_date, end_date, status, program_type } = filters;
            
            // Get allocations
            let allocQuery = `SELECT * FROM ${TABLE.allocations} WHERE 1=1`;
            const allocParams = [];
            
            if (status && status !== 'all') {
                allocQuery += ` AND status = $${allocParams.length + 1}`;
                allocParams.push(status);
            }
            
            const allocResult = await db.query(allocQuery, allocParams);
            const allocations = allocResult.rows;
            
            // Get allocation history
            let historyQuery = `SELECT * FROM ${TABLE.allocation_history} WHERE is_pocket_money = FALSE`;
            const histParams = [];
            
            if (start_date) {
                historyQuery += ` AND created_at >= $${histParams.length + 1}`;
                histParams.push(start_date);
            }
            
            if (end_date) {
                historyQuery += ` AND created_at <= $${histParams.length + 1}`;
                histParams.push(`${end_date}T23:59:59.999Z`);
            }
            
            if (program_type && program_type !== 'all') {
                historyQuery += ` AND program_type = $${histParams.length + 1}`;
                histParams.push(program_type);
            }
            
            const historyResult = await db.query(historyQuery, histParams);
            const allocationHistory = historyResult.rows;
            
            // Get customers and products for enrichment
            const customerIds = [...new Set([...allocations.map(a => a.customer_id), ...allocationHistory.map(h => h.customer_id)])];
            const productIds = [...new Set([...allocations.map(a => a.product_id), ...allocationHistory.map(h => h.product_id)])];
            
            let customers = [];
            if (customerIds.length > 0) {
                const custResult = await db.query(
                    `SELECT customer_id, name, class FROM ${TABLE.customers} WHERE customer_id = ANY($1)`,
                    [customerIds]
                );
                customers = custResult.rows;
            }
            
            let products = [];
            if (productIds.length > 0) {
                const prodResult = await db.query(
                    `SELECT product_id, name, department FROM ${TABLE.products} WHERE product_id = ANY($1)`,
                    [productIds]
                );
                products = prodResult.rows;
            }
            
            // Analyze active allocations
            const activeAllocations = allocations.filter(a => a.status === 'Active');
            const pendingAllocations = activeAllocations.filter(a => 
                !a.last_given_date || 
                (a.next_due_date && new Date() >= new Date(a.next_due_date))
            );
            
            // Enrich allocation history
            const enrichedHistory = allocationHistory.map(history => {
                const customer = customers.find(c => c.customer_id === history.customer_id);
                const product = products.find(p => p.product_id === history.product_id);
                const allocation = allocations.find(a => a.allocation_id === history.allocation_id);
                
                return {
                    ...history,
                    customer_name: customer?.name || 'Unknown',
                    customer_class: customer?.class || 'Unknown',
                    product_name: product?.name || 'Unknown',
                    department: product?.department || 'Unknown',
                    frequency: allocation?.frequency || 'unknown',
                    allocation_status: allocation?.status || 'unknown'
                };
            });
            
            // Group by customer
            const byCustomer = {};
            enrichedHistory.forEach(history => {
                if (!byCustomer[history.customer_id]) {
                    byCustomer[history.customer_id] = {
                        customer_name: history.customer_name,
                        customer_class: history.customer_class,
                        allocations_received: 0,
                        total_items: 0,
                        last_allocation_date: null,
                        program_type: history.program_type
                    };
                }
                byCustomer[history.customer_id].allocations_received++;
                byCustomer[history.customer_id].total_items += parseInt(history.quantity) || 1;
                
                const historyDate = new Date(history.given_date);
                const currentLastDate = byCustomer[history.customer_id].last_allocation_date;
                if (!currentLastDate || historyDate > new Date(currentLastDate)) {
                    byCustomer[history.customer_id].last_allocation_date = history.given_date;
                }
            });
            
            // Group by product
            const byProduct = {};
            enrichedHistory.forEach(history => {
                if (!byProduct[history.product_id]) {
                    byProduct[history.product_id] = {
                        product_name: history.product_name,
                        department: history.department,
                        total_allocated: 0,
                        unique_customers: new Set()
                    };
                }
                byProduct[history.product_id].total_allocated += parseInt(history.quantity) || 1;
                byProduct[history.product_id].unique_customers.add(history.customer_id);
            });
            
            // Convert sets to counts
            Object.keys(byProduct).forEach(productId => {
                byProduct[productId].unique_customers_count = byProduct[productId].unique_customers.size;
                delete byProduct[productId].unique_customers;
            });
            
            return {
                success: true,
                period: { start_date, end_date },
                summary: {
                    total_active_allocations: activeAllocations.length,
                    pending_allocations: pendingAllocations.length,
                    allocations_given: enrichedHistory.length,
                    total_items_given: enrichedHistory.reduce((sum, h) => sum + (parseInt(h.quantity) || 1), 0),
                    unique_customers: Object.keys(byCustomer).length,
                    unique_products: Object.keys(byProduct).length
                },
                breakdown: {
                    by_customer: Object.values(byCustomer).sort((a, b) => b.allocations_received - a.allocations_received).slice(0, 20),
                    by_product: Object.values(byProduct).sort((a, b) => b.total_allocated - a.total_allocated).slice(0, 20),
                    by_program_type: enrichedHistory.reduce((acc, h) => {
                        const type = h.program_type || 'Unknown';
                        if (!acc[type]) acc[type] = { count: 0, items: 0 };
                        acc[type].count++;
                        acc[type].items += parseInt(h.quantity) || 1;
                        return acc;
                    }, {})
                },
                pending_allocations_list: pendingAllocations.slice(0, 20).map(alloc => {
                    const customer = customers.find(c => c.customer_id === alloc.customer_id);
                    const product = products.find(p => p.product_id === alloc.product_id);
                    const daysOverdue = alloc.next_due_date ? 
                        Math.max(0, Math.floor((new Date() - new Date(alloc.next_due_date)) / (1000 * 60 * 60 * 24))) : 
                        (alloc.last_given_date ? 999 : 0);
                    
                    return {
                        allocation_id: alloc.allocation_id,
                        customer_name: customer?.name || 'Unknown',
                        customer_class: customer?.class || 'Unknown',
                        product_name: product?.name || 'Unknown',
                        frequency: alloc.frequency,
                        last_given: alloc.last_given_date,
                        next_due: alloc.next_due_date,
                        days_overdue: daysOverdue,
                        status: daysOverdue > 0 ? 'Overdue' : 'Due'
                    };
                }),
                recent_allocations: enrichedHistory
                    .sort((a, b) => new Date(b.given_date) - new Date(a.given_date))
                    .slice(0, 20)
            };
            
        } catch (error) {
            console.error('Allocation report error:', error);
            throw error;
        }
    }
    
    // ==================== POCKET MONEY REPORTS ====================
    
    /**
     * Pocket money program report
     */
    async getPocketMoneyReport(filters = {}) {
        try {
            const { start_date, end_date, customer_id } = filters;
            
            // Get pocket money sales
            let salesQuery = `
                SELECT s.*, c.name as customer_name, c.class as customer_class 
                FROM ${TABLE.sales} s 
                JOIN ${TABLE.customers} c ON s.customer_id = c.customer_id 
                WHERE s.sale_type = 'pocket_money' 
                AND c.boarding_status = 'Boarding'
            `;
            
            const salesParams = [];
            
            if (start_date) {
                salesQuery += ` AND s.created_at >= $${salesParams.length + 1}`;
                salesParams.push(start_date);
            }
            
            if (end_date) {
                salesQuery += ` AND s.created_at <= $${salesParams.length + 1}`;
                salesParams.push(`${end_date}T23:59:59.999Z`);
            }
            
            if (customer_id) {
                salesQuery += ` AND s.customer_id = $${salesParams.length + 1}`;
                salesParams.push(customer_id);
            }
            
            salesQuery += ` ORDER BY s.created_at DESC`;
            
            const salesResult = await db.query(salesQuery, salesParams);
            const pocketMoneySales = salesResult.rows;
            
            // Get sale items
            const saleIds = pocketMoneySales.map(s => s.sale_id);
            let saleItems = [];
            if (saleIds.length > 0) {
                const itemsResult = await db.query(
                    `SELECT * FROM ${TABLE.sale_items} WHERE sale_id = ANY($1)`,
                    [saleIds]
                );
                saleItems = itemsResult.rows;
            }
            
            // Get pocket money top-ups and deductions from ${TABLE.allocation_history}
            let historyQuery = `
                SELECT * FROM ${TABLE.allocation_history} 
                WHERE is_pocket_money = TRUE 
                AND (sku = 'TOPUP' OR sku = 'DEDUCT')
            `;
            
            const historyParams = [];
            
            if (start_date) {
                historyQuery += ` AND created_at >= $${historyParams.length + 1}`;
                historyParams.push(start_date);
            }
            
            if (end_date) {
                historyQuery += ` AND created_at <= $${historyParams.length + 1}`;
                historyParams.push(`${end_date}T23:59:59.999Z`);
            }
            
            if (customer_id) {
                historyQuery += ` AND customer_id = $${historyParams.length + 1}`;
                historyParams.push(customer_id);
            }
            
            const historyResult = await db.query(historyQuery, historyParams);
            const pocketMoneyHistory = historyResult.rows;
            
            // Combine sales and history for transactions
            const allTransactions = [
                ...pocketMoneySales.map(s => ({ ...s, type: 'purchase' })),
                ...pocketMoneyHistory.map(h => ({ 
                    ...h, 
                    type: h.sku === 'TOPUP' ? 'topup' : 'deduction',
                    total: parseFloat(h.unit_price) || 0
                }))
            ].sort((a, b) => new Date(b.created_at || b.given_date) - new Date(a.created_at || a.given_date));
            
            // Calculate statistics
            const stats = {
                total_transactions: allTransactions.length,
                total_amount: allTransactions.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0),
                unique_customers: [...new Set(allTransactions.map(t => t.customer_id))].length,
                by_department: {},
                by_customer: {},
                by_transaction_type: {
                    purchase: { count: 0, amount: 0 },
                    topup: { count: 0, amount: 0 },
                    deduction: { count: 0, amount: 0 }
                }
            };
            
            // Group by department (for purchases only)
            pocketMoneySales.forEach(sale => {
                const dept = sale.department || 'Unknown';
                if (!stats.by_department[dept]) {
                    stats.by_department[dept] = { transactions: 0, amount: 0 };
                }
                stats.by_department[dept].transactions++;
                stats.by_department[dept].amount += parseFloat(sale.total) || 0;
            });
            
            // Group by customer
            allTransactions.forEach(trans => {
                // Transaction type stats
                if (stats.by_transaction_type[trans.type]) {
                    stats.by_transaction_type[trans.type].count++;
                    stats.by_transaction_type[trans.type].amount += parseFloat(trans.total) || 0;
                }
                
                // Customer stats
                if (!stats.by_customer[trans.customer_id]) {
                    stats.by_customer[trans.customer_id] = {
                        customer_name: trans.customer_name || 'Unknown',
                        customer_class: trans.customer_class || 'Unknown',
                        transactions: 0,
                        total_amount: 0,
                        purchases: 0,
                        topups: 0,
                        deductions: 0,
                        last_transaction: null
                    };
                }
                
                stats.by_customer[trans.customer_id].transactions++;
                stats.by_customer[trans.customer_id].total_amount += parseFloat(trans.total) || 0;
                
                if (trans.type === 'purchase') stats.by_customer[trans.customer_id].purchases++;
                if (trans.type === 'topup') stats.by_customer[trans.customer_id].topups++;
                if (trans.type === 'deduction') stats.by_customer[trans.customer_id].deductions++;
                
                const transDate = new Date(trans.created_at || trans.given_date);
                const currentLastDate = stats.by_customer[trans.customer_id].last_transaction;
                if (!currentLastDate || transDate > new Date(currentLastDate)) {
                    stats.by_customer[trans.customer_id].last_transaction = trans.created_at || trans.given_date;
                }
            });
            
            // Get current pocket money balances
            const balancesResult = await db.query(`
                SELECT customer_id, name, class, pocket_money_balance 
                FROM ${TABLE.customers} 
                WHERE boarding_status = 'Boarding' 
                AND pocket_money_enabled = TRUE
                ORDER BY class, name
            `);
            
            return {
                success: true,
                period: { start_date, end_date },
                summary: stats,
                breakdown: {
                    by_department: stats.by_department,
                    by_customer: Object.values(stats.by_customer).sort((a, b) => b.total_amount - a.total_amount).slice(0, 20),
                    by_transaction_type: stats.by_transaction_type
                },
                current_balances: balancesResult.rows.map(c => ({
                    customer_id: c.customer_id,
                    name: c.name,
                    class: c.class,
                    current_balance: parseFloat(c.pocket_money_balance) || 0
                })),
                recent_transactions: allTransactions.slice(0, 20).map(trans => ({
                    date: trans.created_at || trans.given_date,
                    type: trans.type,
                    customer_name: trans.customer_name || 'Unknown',
                    customer_class: trans.customer_class || 'Unknown',
                    department: trans.department || 'N/A',
                    total: parseFloat(trans.total) || 0,
                    notes: trans.transaction_notes || trans.notes || ''
                }))
            };
            
        } catch (error) {
            console.error('Pocket money report error:', error);
            throw error;
        }
    }
    
    // ==================== INSTALLMENT REPORTS ====================
    
    /**
     * Installment payment report
     */
    async getInstallmentReport(filters = {}) {
        try {
            const { start_date, end_date, customer_id, parent_phone } = filters;
            
            let query = `SELECT * FROM ${TABLE.installment_payments} WHERE 1=1`;
            const params = [];
            let paramCount = 0;
            
            if (start_date) {
                paramCount++;
                query += ` AND created_at >= $${paramCount}`;
                params.push(start_date);
            }
            
            if (end_date) {
                paramCount++;
                query += ` AND created_at <= $${paramCount}`;
                params.push(`${end_date}T23:59:59.999Z`);
            }
            
            if (customer_id) {
                paramCount++;
                query += ` AND customer_id = $${paramCount}`;
                params.push(customer_id);
            }
            
            if (parent_phone) {
                paramCount++;
                query += ` AND parent_phone LIKE $${paramCount}`;
                params.push(`%${parent_phone}%`);
            }
            
            query += ` ORDER BY created_at DESC`;
            
            const result = await db.query(query, params);
            const installmentPayments = result.rows;
            
            // Get customer details
            const customerIds = [...new Set(installmentPayments.map(p => p.customer_id))];
            let customers = [];
            if (customerIds.length > 0) {
                const custResult = await db.query(
                    `SELECT customer_id, name, class, program_membership, balance 
                     FROM ${TABLE.customers} WHERE customer_id = ANY($1)`,
                    [customerIds]
                );
                customers = custResult.rows;
            }
            
            // Enrich payment data
            const enrichedPayments = installmentPayments.map(payment => {
                const customer = customers.find(c => c.customer_id === payment.customer_id);
                
                return {
                    ...payment,
                    customer_name: customer?.name || 'Unknown',
                    customer_class: customer?.class || 'Unknown',
                    program_membership: customer?.program_membership || 'none',
                    current_balance: parseFloat(customer?.balance) || 0
                };
            });
            
            // Calculate statistics
            const stats = {
                total_payments: enrichedPayments.length,
                total_amount: enrichedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
                unique_customers: [...new Set(enrichedPayments.map(p => p.customer_id))].length,
                unique_parents: [...new Set(enrichedPayments.map(p => p.parent_phone).filter(Boolean))].length,
                by_payment_method: {},
                by_customer: {},
                by_parent: {}
            };
            
            // Group by payment method
            enrichedPayments.forEach(payment => {
                const method = payment.payment_method || 'Unknown';
                if (!stats.by_payment_method[method]) {
                    stats.by_payment_method[method] = { count: 0, amount: 0 };
                }
                stats.by_payment_method[method].count++;
                stats.by_payment_method[method].amount += parseFloat(payment.amount) || 0;
            });
            
            // Group by customer
            enrichedPayments.forEach(payment => {
                if (!stats.by_customer[payment.customer_id]) {
                    stats.by_customer[payment.customer_id] = {
                        customer_name: payment.customer_name,
                        customer_class: payment.customer_class,
                        payments: 0,
                        total_paid: 0,
                        last_payment_date: null,
                        current_balance: payment.current_balance
                    };
                }
                stats.by_customer[payment.customer_id].payments++;
                stats.by_customer[payment.customer_id].total_paid += parseFloat(payment.amount) || 0;
                
                const paymentDate = new Date(payment.created_at);
                const currentLastDate = stats.by_customer[payment.customer_id].last_payment_date;
                if (!currentLastDate || paymentDate > new Date(currentLastDate)) {
                    stats.by_customer[payment.customer_id].last_payment_date = payment.created_at;
                }
            });
            
            // Group by parent
            enrichedPayments.forEach(payment => {
                if (!payment.parent_phone) return;
                
                if (!stats.by_parent[payment.parent_phone]) {
                    stats.by_parent[payment.parent_phone] = {
                        parent_name: payment.parent_name || 'Unknown',
                        payments: 0,
                        total_paid: 0,
                        customers_count: new Set(),
                        last_payment_date: null
                    };
                }
                stats.by_parent[payment.parent_phone].payments++;
                stats.by_parent[payment.parent_phone].total_paid += parseFloat(payment.amount) || 0;
                stats.by_parent[payment.parent_phone].customers_count.add(payment.customer_id);
                
                const paymentDate = new Date(payment.created_at);
                const currentLastDate = stats.by_parent[payment.parent_phone].last_payment_date;
                if (!currentLastDate || paymentDate > new Date(currentLastDate)) {
                    stats.by_parent[payment.parent_phone].last_payment_date = payment.created_at;
                }
            });
            
            // Convert sets to counts
            Object.keys(stats.by_parent).forEach(parentPhone => {
                stats.by_parent[parentPhone].customers_count = stats.by_parent[parentPhone].customers_count.size;
            });
            
            return {
                success: true,
                period: { start_date, end_date },
                summary: stats,
                breakdown: {
                    by_payment_method: stats.by_payment_method,
                    by_customer: Object.values(stats.by_customer).sort((a, b) => b.total_paid - a.total_paid).slice(0, 20),
                    by_parent: Object.values(stats.by_parent).sort((a, b) => b.total_paid - a.total_paid).slice(0, 20)
                },
                recent_payments: enrichedPayments.slice(0, 20).map(payment => ({
                    payment_date: payment.created_at,
                    customer_name: payment.customer_name,
                    parent_name: payment.parent_name,
                    parent_phone: payment.parent_phone,
                    payment_method: payment.payment_method,
                    amount: parseFloat(payment.amount) || 0,
                    reference: payment.reference,
                    notes: payment.notes
                }))
            };
            
        } catch (error) {
            console.error('Installment report error:', error);
            throw error;
        }
    }
    
    // ==================== SUPPLIER REPORTS ====================
    
    /**
     * Supplier report (uses supplierService)
     */
    async getSupplierReport() {
        try {
            // Import supplierService dynamically to avoid circular dependency
            const supplierService = require('./supplierService');
            
            const [performance, dueCredits, lowStock] = await Promise.all([
                supplierService.getSupplierPerformance(),
                supplierService.getDueCreditsReport(),
                supplierService.getLowStockSuppliers()
            ]);
            
            return {
                success: true,
                performance: performance,
                due_credits: {
                    count: dueCredits.length,
                    total_amount: dueCredits.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0),
                    credits: dueCredits
                },
                low_stock_alerts: {
                    count: lowStock.length,
                    items: lowStock
                }
            };
            
        } catch (error) {
            console.error('Supplier report error:', error);
            throw error;
        }
    }
    
    // ==================== EXPORT FUNCTIONS ====================
    
    /**
     * Export data to Excel
     */
    async exportToExcel(exportType = 'all', filters = {}) {
        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'SteadyMonitor POS System';
            workbook.created = new Date();
            
            // Add worksheets based on export type
            if (exportType === 'all' || exportType === 'sales') {
                const salesReport = await this.getSalesReport(filters);
                const salesSheet = workbook.addWorksheet('Sales Report');
                
                // Add headers
                salesSheet.columns = [
                    { header: 'Sale ID', key: 'sale_id', width: 20 },
                    { header: 'Date', key: 'date', width: 20 },
                    { header: 'Department', key: 'department', width: 15 },
                    { header: 'Customer', key: 'customer_name', width: 25 },
                    { header: 'Type', key: 'customer_type', width: 10 },
                    { header: 'Payment Mode', key: 'payment_mode', width: 15 },
                    { header: 'Total', key: 'total', width: 15, style: { numFmt: '#,##0.00' } },
                    { header: 'Paid', key: 'paid', width: 15, style: { numFmt: '#,##0.00' } },
                    { header: 'Balance', key: 'balance', width: 15, style: { numFmt: '#,##0.00' } },
                    { header: 'Served By', key: 'served_by', width: 20 }
                ];
                
                // Add data
                salesReport.sales.forEach(sale => {
                    salesSheet.addRow({
                        sale_id: sale.sale_id,
                        date: sale.date,
                        department: sale.department,
                        customer_name: sale.customer_name || 'Walk-in',
                        customer_type: sale.customer_type,
                        payment_mode: sale.payment_mode,
                        total: sale.total,
                        paid: sale.paid,
                        balance: sale.balance,
                        served_by: sale.served_by
                    });
                });
                
                // Add summary
                salesSheet.addRow([]);
                salesSheet.addRow(['SUMMARY', '', '', '', '', '', '', '', '']);
                salesSheet.addRow(['Total Transactions', '', '', '', '', '', salesReport.summary.total_transactions, '', '']);
                salesSheet.addRow(['Total Sales', '', '', '', '', '', salesReport.summary.total_sales, '', '']);
                salesSheet.addRow(['Total Paid', '', '', '', '', '', salesReport.summary.total_paid, '', '']);
                salesSheet.addRow(['Total Balance', '', '', '', '', '', salesReport.summary.total_balance, '', '']);
            }
            
            if (exportType === 'all' || exportType === 'inventory') {
                const inventoryReport = await this.getInventoryReport();
                const inventorySheet = workbook.addWorksheet('Inventory');
                
                inventorySheet.columns = [
                    { header: 'Product ID', key: 'product_id', width: 20 },
                    { header: 'SKU', key: 'sku', width: 15 },
                    { header: 'Name', key: 'name', width: 30 },
                    { header: 'Department', key: 'department', width: 15 },
                    { header: 'Stock', key: 'stock_qty', width: 10 },
                    { header: 'Reorder Level', key: 'reorder_level', width: 12 },
                    { header: 'Buy Price', key: 'buy_price', width: 12, style: { numFmt: '#,##0.00' } },
                    { header: 'Sell Price', key: 'sell_price', width: 12, style: { numFmt: '#,##0.00' } },
                    { header: 'Retail Value', key: 'retail_value', width: 15, style: { numFmt: '#,##0.00' } },
                    { header: 'Status', key: 'status', width: 10 }
                ];
                
                const allProducts = await db.query(
                    'SELECT * FROM ${TABLE.products} WHERE active = true ORDER BY department, name'
                );
                
                allProducts.rows.forEach(product => {
                    inventorySheet.addRow({
                        product_id: product.product_id,
                        sku: product.sku,
                        name: product.name,
                        department: product.department,
                        stock_qty: product.stock_qty,
                        reorder_level: product.reorder_level,
                        buy_price: product.buy_price,
                        sell_price: product.sell_price,
                        retail_value: (product.stock_qty || 0) * (parseFloat(product.sell_price) || 0),
                        status: (product.stock_qty || 0) <= (product.reorder_level || 0) ? 'LOW' : 'OK'
                    });
                });
            }
            
            if (exportType === 'all' || exportType === 'customers') {
                const customerSheet = workbook.addWorksheet('Customers');
                
                customerSheet.columns = [
                    { header: 'Customer ID', key: 'customer_id', width: 20 },
                    { header: 'Name', key: 'name', width: 25 },
                    { header: 'Class', key: 'class', width: 15 },
                    { header: 'Boarding Status', key: 'boarding_status', width: 15 },
                    { header: 'Program', key: 'program_membership', width: 15 },
                    { header: 'Contact', key: 'contact', width: 15 },
                    { header: 'Parent', key: 'parent_name', width: 25 },
                    { header: 'Parent Phone', key: 'parent_phone', width: 15 },
                    { header: 'Balance', key: 'balance', width: 15, style: { numFmt: '#,##0.00' } },
                    { header: 'Installment Status', key: 'installment_status', width: 15 }
                ];
                
                const customers = await db.query(
                    'SELECT * FROM ${TABLE.customers} ORDER BY class, name'
                );
                
                customers.rows.forEach(customer => {
                    customerSheet.addRow({
                        customer_id: customer.customer_id,
                        name: customer.name,
                        class: customer.class,
                        boarding_status: customer.boarding_status,
                        program_membership: customer.program_membership,
                        contact: customer.contact,
                        parent_name: customer.parent_name,
                        parent_phone: customer.parent_phone,
                        balance: customer.balance,
                        installment_status: customer.installment_status
                    });
                });
            }
            
            if (exportType === 'all' || exportType === 'suppliers') {
                const supplierSheet = workbook.addWorksheet('Suppliers');
                
                supplierSheet.columns = [
                    { header: 'Supplier ID', key: 'supplier_id', width: 20 },
                    { header: 'Name', key: 'name', width: 30 },
                    { header: 'Contact', key: 'contact', width: 20 },
                    { header: 'Email', key: 'email', width: 25 },
                    { header: 'Products Supplied', key: 'products_supplied', width: 30 },
                    { header: 'Balance', key: 'balance', width: 15, style: { numFmt: '#,##0.00' } },
                    { header: 'Status', key: 'active', width: 10 }
                ];
                
                const suppliers = await db.query(
                    'SELECT * FROM ${TABLE.suppliers} WHERE active = true ORDER BY name'
                );
                
                suppliers.rows.forEach(supplier => {
                    supplierSheet.addRow({
                        supplier_id: supplier.supplier_id,
                        name: supplier.name,
                        contact: supplier.contact,
                        email: supplier.email,
                        products_supplied: supplier.products_supplied,
                        balance: supplier.balance,
                        active: supplier.active ? 'Active' : 'Inactive'
                    });
                });
            }
            
            // Save to buffer
            const buffer = await workbook.xlsx.writeBuffer();
            return buffer;
            
        } catch (error) {
            console.error('Excel export error:', error);
            throw error;
        }
    }
    
    /**
     * Generate PDF report
     */
    async generatePDF(reportType, filters = {}) {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            
            return new Promise((resolve, reject) => {
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    resolve(pdfBuffer);
                });
                
                doc.on('error', reject);
                
                // Add content based on report type
                doc.fontSize(20).text('SteadyMonitor POS System Report', { align: 'center' });
                doc.moveDown();
                doc.fontSize(12).text(`Report Type: ${reportType}`, { align: 'center' });
                doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
                doc.moveDown();
                
                // Add report-specific content
                switch (reportType) {
                    case 'sales_summary':
                        this._addSalesSummaryPDF(doc, filters);
                        break;
                    case 'inventory_summary':
                        this._addInventorySummaryPDF(doc, filters);
                        break;
                    case 'customer_summary':
                        this._addCustomerSummaryPDF(doc, filters);
                        break;
                    default:
                        doc.text('Report content not available', { align: 'center' });
                }
                
                doc.end();
            });
            
        } catch (error) {
            console.error('PDF generation error:', error);
            throw error;
        }
    }
    
    // Private helper methods for PDF generation
    _addSalesSummaryPDF(doc, filters) {
        // Implementation for sales summary PDF
        doc.fontSize(16).text('Sales Summary Report', { underline: true });
        doc.moveDown();
        doc.fontSize(12).text('This is a summary of sales data.');
        doc.moveDown();
        doc.text('More detailed reports available in Excel format.');
    }
    
    _addInventorySummaryPDF(doc, filters) {
        doc.fontSize(16).text('Inventory Summary Report', { underline: true });
        doc.moveDown();
        doc.fontSize(12).text('Current inventory valuation and low stock items.');
    }
    
    _addCustomerSummaryPDF(doc, filters) {
        doc.fontSize(16).text('Customer Summary Report', { underline: true });
        doc.moveDown();
        doc.fontSize(12).text('Customer statistics and balances overview.');
    }
    
    /**
     * Check for old data and notify admin
     */
    async getDataRetentionNotification() {
        return await this.checkOldDataNotification();
    }
}

module.exports = new ReportService();