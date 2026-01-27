// backend/routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const customerService = require('../services/customerService');
const db = require('../config/database'); // Added database import
const { requirePermission } = require('../middleware/authMiddleware'); // ← ADD THIS

// Note: Auth middleware is not included since it wasn't in the original Excel file
// You'll need to add it later: const { requirePermission } = require('../middleware/authMiddleware');

// =============== 1. GENERAL CUSTOMER MANAGEMENT ===============

/**
 * GET /api/customers
 * Get all customers with filtering options
 */
router.get('/', requirePermission('customers'), async (req, res) => {
    try {
        const filters = {
            className: req.query.class,
            boardingStatus: req.query.boarding,
            program: req.query.program,
            search: req.query.search
        };

        const customers = await customerService.getAllCustomers(filters);

        // Calculate statistics
        const customersWithBalance = customers.filter(c => (parseFloat(c.balance) || 0) > 0);
        const totalOwed = customersWithBalance.reduce((sum, c) => sum + (parseFloat(c.balance) || 0), 0);
        
        const programACount = customers.filter(c => c.program_membership === 'A').length;
        const programBCount = customers.filter(c => c.program_membership === 'B').length;
        
        const boardersCount = customers.filter(c => c.boarding_status === 'Boarding').length;
        const dayScholarsCount = customers.filter(c => c.boarding_status === 'Day').length;
        
        const installmentCount = customers.filter(c => c.payment_method === 'installment').length;
        const cashCount = customers.filter(c => c.payment_method === 'cash').length;
        const mpesaCount = customers.filter(c => c.payment_method === 'mpesa').length;

        // Get unique classes
        const uniqueClasses = await customerService.getUniqueClasses();

        res.json({
            success: true,
            count: customers.length,
            stats: {
                total: customers.length,
                with_balance: customersWithBalance.length,
                total_owed: totalOwed,
                program_A: programACount,
                program_B: programBCount,
                boarders: boardersCount,
                day_scholars: dayScholarsCount,
                payment_methods: {
                    installment: installmentCount,
                    cash: cashCount,
                    mpesa: mpesaCount
                }
            },
            filters: {
                classes: uniqueClasses,
                boarding_statuses: ['Day', 'Boarding'],
                programs: ['A', 'B', 'none']
            },
            customers: customers.map(customer => ({
                customer_id: customer.customer_id,
                name: customer.name,
                class: customer.class || 'Not assigned',
                boarding_status: customer.boarding_status || 'Day',
                program_membership: customer.program_membership || 'none',
                allocation_program: customer.allocation_program || 'none',
                exercise_book_program: customer.exercise_book_program || false,
                pocket_money_enabled: customer.pocket_money_enabled || false,
                total_items_cost: parseFloat(customer.total_items_cost) || 0,
                amount_paid: parseFloat(customer.amount_paid) || 0,
                balance: parseFloat(customer.balance) || 0,
                contact: customer.contact || '',
                email: customer.email || '',
                parent_name: customer.parent_name || '',
                parent_phone: customer.parent_phone || '',
                guardian_address: customer.guardian_address || '',
                guardian_email: customer.guardian_email || '',
                payment_method: customer.payment_method || 'installment',
                payment_duration_months: parseInt(customer.payment_duration_months) || 0,
                installment_status: customer.installment_status || 'not_paid',
                last_payment_date: customer.last_payment_date || '',
                next_payment_due: customer.next_payment_due || '',
                notes: customer.notes || '',
                disbursement_notes: customer.disbursement_notes || '',
                class_teacher: customer.class_teacher || '',
                created_at: customer.created_at,
                updated_at: customer.updated_at
            }))
        });
    } catch (error) {
        console.error('❌ Get customers error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch customers',
            error: error.message 
        });
    }
});

/**
 * GET /api/customers/:identifier
 * Get customer by ID or search by name
 */
router.get('/:identifier', requirePermission('customers'), async (req, res) => {
    try {
        const { identifier } = req.params;
        
        let customer;
        
        // First try to find by customer_id
        customer = await customerService.findCustomerById(identifier);
        
        // If not found, try to search by name
        if (!customer) {
            const customers = await customerService.findCustomerByName(identifier);
            if (customers.length > 0) {
                customer = customers[0];
            }
        }
        
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Get customer's transactions
        const transactions = await customerService.getCustomerTransactions(customer.customer_id);
        
        // Get customer's ledger
        const ledger = await customerService.getCustomerLedger(customer.customer_id);
        
        // Get customer's allocations
        const allocations = await customerService.getCustomerAllocations(customer.customer_id);
        
        // Get installment payments
        const installmentPayments = await customerService.getInstallmentPayments(customer.customer_id);

        res.json({
            success: true,
            customer: {
                customer_id: customer.customer_id,
                name: customer.name,
                class: customer.class || 'Not assigned',
                boarding_status: customer.boarding_status || 'Day',
                program_membership: customer.program_membership || 'none',
                allocation_program: customer.allocation_program || 'none',
                exercise_book_program: customer.exercise_book_program || false,
                pocket_money_enabled: customer.pocket_money_enabled || false,
                allocation_frequency_metadata: customer.allocation_frequency_metadata || {},
                balance: parseFloat(customer.balance) || 0,
                contact: customer.contact || '',
                email: customer.email || '',
                parent_name: customer.parent_name || '',
                parent_phone: customer.parent_phone || '',
                payment_method: customer.payment_method || 'installment',
                installment_status: customer.installment_status || 'not_paid',
                notes: customer.notes || '',
                created_at: customer.created_at,
                updated_at: customer.updated_at
            },
            statistics: {
                total_transactions: transactions.count,
                current_balance: parseFloat(customer.balance) || 0,
                active_debts: ledger.outstanding_debts.length,
                active_allocations: allocations.allocations.length,
                pending_allocations: allocations.pending_items.length,
                installment_payments: installmentPayments.length,
                total_installment_paid: installmentPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
            },
            recent_transactions: transactions.transactions.slice(0, 10),
            active_debts: ledger.outstanding_debts,
            pending_allocations: allocations.pending_items,
            installment_payments: installmentPayments.slice(0, 10)
        });
    } catch (error) {
        console.error('❌ Get customer error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch customer',
            error: error.message 
        });
    }
});

/**
 * POST /api/customers
 * Create new learner with full details
 */
router.post('/', requirePermission('customers'), async (req, res) => {
    try {
        const { 
            name, 
            class: className, 
            boarding_status,
            program_membership,
            allocation_program,
            allocation_frequency_metadata,
            pocket_money_enabled,
            contact,
            email,
            parent_name,
            parent_phone,
            guardian_address,
            guardian_email,
            payment_method,
            payment_duration_months,
            notes,
            disbursement_notes,
            class_teacher
        } = req.body;

        if (!name) {
            return res.status(400).json({ 
                success: false, 
                message: 'Customer name is required' 
            });
        }

        // Validate program membership
        let finalProgramMembership = program_membership || 'none';
        
        // Validate pocket money for boarders only
        let finalPocketMoneyEnabled = pocket_money_enabled || false;
        if (finalPocketMoneyEnabled && boarding_status !== 'Boarding') {
            return res.status(400).json({
                success: false,
                message: 'Pocket money can only be enabled for Boarders'
            });
        }

        const customerData = {
            name: name.trim(),
            class: className || '',
            boarding_status: boarding_status || 'Day',
            program_membership: finalProgramMembership,
            allocation_program: allocation_program || 'none',
            exercise_book_program: program_membership === 'B',
            pocket_money_enabled: finalPocketMoneyEnabled,
            allocation_frequency_metadata: allocation_frequency_metadata || {},
            contact: contact || '',
            email: email || '',
            parent_name: parent_name || '',
            parent_phone: parent_phone || '',
            guardian_address: guardian_address || '',
            guardian_email: guardian_email || '',
            payment_method: payment_method || 'installment',
            payment_duration_months: parseInt(payment_duration_months) || 0,
            notes: notes || '',
            disbursement_notes: disbursement_notes || '',
            class_teacher: class_teacher || ''
        };

        const customer = await customerService.createCustomer(customerData);

        console.log(`✅ Customer created: ${customer.name} (${customer.customer_id})`);

        res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            customer: customer
        });
    } catch (error) {
        console.error('❌ Create customer error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to save customer',
            error: error.message 
        });
    }
});

/**
 * PUT /api/customers/:id
 * Update customer details
 */
router.put('/:id', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Don't allow updating customer_id or financial fields directly
        delete updates.customer_id;
        delete updates.balance;
        delete updates.total_items_cost;
        delete updates.amount_paid;
        
        // Validate program membership changes
        if (updates.program_membership) {
            if (updates.program_membership === 'C') {
                return res.status(400).json({
                    success: false,
                    message: 'Program C is not a valid program. Use pocket_money_enabled for pocket money.'
                });
            }
            
            // Update related program fields
            if (updates.program_membership === 'A') {
                updates.exercise_book_program = false;
            } else if (updates.program_membership === 'B') {
                updates.exercise_book_program = true;
                updates.allocation_program = 'none';
            } else if (updates.program_membership === 'none') {
                updates.exercise_book_program = false;
                updates.allocation_program = 'none';
            }
        }
        
        // Validate pocket money for boarders only
        if (updates.pocket_money_enabled !== undefined) {
            const customer = await customerService.findCustomerById(id);
            const newBoardingStatus = updates.boarding_status || customer.boarding_status;
            if (updates.pocket_money_enabled && newBoardingStatus !== 'Boarding') {
                return res.status(400).json({
                    success: false,
                    message: 'Pocket money can only be enabled for Boarders'
                });
            }
        }

        const updatedCustomer = await customerService.updateCustomer(id, updates);

        console.log(`✅ Customer updated: ${updatedCustomer.name}`);

        res.json({
            success: true,
            message: 'Customer updated successfully',
            customer: updatedCustomer
        });
    } catch (error) {
        console.error('❌ Update customer error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update customer',
            error: error.message 
        });
    }
});

/**
 * DELETE /api/customers/:id
 * Delete customer permanently
 */
router.delete('/:id', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await customerService.deleteCustomer(id);

        console.log(`✅ Customer deleted: ${result.name}`);

        res.json({
            success: true,
            message: 'Customer deleted successfully',
            deleted_customer: result.name
        });
    } catch (error) {
        console.error('❌ Delete customer error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete customer',
            error: error.message 
        });
    }
});

// =============== 2. PAYMENT & BALANCE MANAGEMENT ===============

/**
 * POST /api/customers/:id/pay
 * Record a debt payment
 */
router.post('/:id/pay', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, method, reference, notes, is_installment } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid amount' 
            });
        }

        const paymentData = {
            amount: parseFloat(amount),
            method: method || 'cash',
            reference: reference || `PAY-${Date.now()}`,
            notes: notes || 'Debt payment',
            is_installment: is_installment || false,
            recorded_by: req.user ? req.user.display_name : 'System'
        };

        const result = await customerService.updateCustomerBalance(id, -parseFloat(amount), paymentData);

        console.log(`💰 Payment recorded: KES ${amount} for customer ${id}`);

        res.json({ 
            success: true, 
            message: 'Payment successful', 
            new_balance: result.new_balance,
            payment: result.payment
        });
    } catch (error) {
        console.error('❌ Payment error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

/**
 * POST /api/customers/:id/adjust-balance
 * Adjust balance (for corrections or admin overrides)
 */
router.post('/:id/adjust-balance', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, reason } = req.body;

        if (!amount || amount === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Amount is required' 
            });
        }

        if (!reason) {
            return res.status(400).json({ 
                success: false, 
                message: 'Reason is required for balance adjustment' 
            });
        }

        const paymentData = {
            amount: Math.abs(parseFloat(amount)),
            method: 'Adjustment',
            reference: `ADJ-${Date.now()}`,
            notes: `${amount > 0 ? 'Added' : 'Deducted'} balance: ${reason}`,
            is_installment: false,
            recorded_by: req.user ? req.user.display_name : 'System'
        };

        const result = await customerService.updateCustomerBalance(id, parseFloat(amount), paymentData);

        console.log(`🔄 Balance adjusted: ${amount > 0 ? '+' : ''}${amount} for customer ${id}`);

        res.json({ 
            success: true, 
            message: 'Balance adjusted successfully', 
            new_balance: result.new_balance,
            adjustment: result.payment
        });
    } catch (error) {
        console.error('❌ Balance adjustment error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// =============== 3. ALLOCATION PROGRAM MANAGEMENT ===============

/**
 * GET /api/customers/:id/allocations
 * Check for due allocation items
 */
router.get('/:id/allocations', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const customer = await customerService.findCustomerById(id);
        if (!customer) {
            return res.status(404).json({ 
                success: false, 
                message: 'Customer not found' 
            });
        }

        // Check if customer is in allocation program (Program A)
        if (customer.program_membership !== 'A') {
            return res.json({
                success: true,
                in_program: false,
                message: 'Customer is not in allocation program (Program A)',
                pending_items: []
            });
        }

        const allocations = await customerService.getCustomerAllocations(id);

        res.json({
            success: true,
            in_program: true,
            program_type: 'A',
            allocation_frequency_metadata: customer.allocation_frequency_metadata || {},
            pending_items: allocations.pending_items,
            total_allocations: allocations.total_allocations,
            pending_count: allocations.pending_count
        });
    } catch (error) {
        console.error('❌ Allocation check error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to check allocations',
            error: error.message 
        });
    }
});

/**
 * POST /api/customers/:id/allocate
 * Add product to customer's allocation program
 */
router.post('/:id/allocate', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        const { product_id, frequency, specific_days, notes, quantity } = req.body;

        if (!product_id || !frequency) {
            return res.status(400).json({ 
                success: false, 
                message: 'Product ID and frequency are required' 
            });
        }

        const customer = await customerService.findCustomerById(id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Only allow for Program A customers
        if (customer.program_membership !== 'A') {
            return res.status(400).json({
                success: false,
                message: 'Allocations only available for Program A customers'
            });
        }

        const allocationData = {
            customer_id: id,
            product_id,
            frequency,
            specific_days: specific_days || '',
            notes: notes || '',
            quantity: quantity || 1
        };

        const allocation = await customerService.addAllocation(allocationData);

        console.log(`📋 Allocation added: product ${product_id} to customer ${customer.name}`);

        res.json({
            success: true,
            message: 'Product added to allocation program',
            allocation: allocation
        });
    } catch (error) {
        console.error('❌ Allocation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to allocate product',
            error: error.message 
        });
    }
});

/**
 * POST /api/customers/:id/fulfill-allocation
 * Fulfill a pending allocation (give item to learner)
 */
router.post('/:id/fulfill-allocation', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        const { allocation_id } = req.body;

        if (!allocation_id) {
            return res.status(400).json({
                success: false,
                message: 'Allocation ID is required'
            });
        }

        const recordedBy = req.user ? req.user.display_name : 'System';
        const result = await customerService.fulfillAllocation(allocation_id, recordedBy);

        console.log(`📦 Allocation fulfilled: ${allocation_id} for customer ${id}`);

        res.json({
            success: true,
            message: 'Allocation fulfilled successfully',
            allocation: result.allocation,
            history: result.history
        });
    } catch (error) {
        console.error('❌ Fulfill allocation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fulfill allocation',
            error: error.message
        });
    }
});

/**
 * GET /api/customers/:id/allocation-history
 * Get customer's allocation history
 */
router.get('/:id/allocation-history', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const customer = await customerService.findCustomerById(id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Get disbursement history which includes allocation history
        const history = await customerService.getDisbursementHistory(id);

        res.json({
            success: true,
            customer_id: id,
            customer_name: customer.name,
            program_membership: customer.program_membership,
            history_count: history.allocation_history.length,
            history: history.allocation_history
        });
    } catch (error) {
        console.error('❌ Allocation history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch allocation history',
            error: error.message
        });
    }
});

// =============== 4. PROGRAM B & POCKET MONEY ENDPOINTS ===============

/**
 * GET /api/customers/:id/pocket-money-status
 * Get pocket money status
 */
router.get('/:id/pocket-money-status', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const customer = await customerService.findCustomerById(id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        if (!customer.pocket_money_enabled) {
            return res.json({
                success: true,
                in_program: false,
                message: 'Customer does not have pocket money enabled'
            });
        }

        // Get pocket money transactions (special sales with pocket_money type)
        const transactions = await customerService.getCustomerTransactions(id);
        const pocketMoneyTransactions = transactions.transactions.filter(t => 
            t.program_type === 'C' || t.description.toLowerCase().includes('pocket')
        );

        const totalPocketMoneySpent = pocketMoneyTransactions.reduce((sum, t) => 
            sum + Math.abs(t.amount), 0
        );

        res.json({
            success: true,
            in_program: true,
            pocket_money_enabled: true,
            boarding_status: customer.boarding_status,
            allowed_departments: ['Stationery', 'Uniform'],
            total_transactions: pocketMoneyTransactions.length,
            total_spent: totalPocketMoneySpent,
            recent_transactions: pocketMoneyTransactions.slice(0, 10)
        });
    } catch (error) {
        console.error('❌ Pocket money status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pocket money status',
            error: error.message
        });
    }
});

/**
 * GET /api/customers/:id/exercise-book-eligibility
 * Check exercise book eligibility for Program B learners
 */
router.get('/:id/exercise-book-eligibility', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const customer = await customerService.findCustomerById(id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const allowedCategories = ['Exercise Books', 'Pens', 'Pencils', 'Rulers'];
        
        res.json({
            success: true,
            eligible: customer.program_membership === 'B' || customer.exercise_book_program,
            program_membership: customer.program_membership,
            exercise_book_program: customer.exercise_book_program,
            allowed_categories: allowedCategories,
            notes: customer.program_membership === 'B' ? 
                   'Program B: Exercise books and essentials only' : 
                   'Standard exercise book program access'
        });
    } catch (error) {
        console.error('❌ Exercise book eligibility error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check exercise book eligibility',
            error: error.message
        });
    }
});

// =============== 5. INSTALLMENT PAYMENT MANAGEMENT ===============

/**
 * POST /api/customers/:id/record-installment
 * Record an installment payment from parent/guardian
 */
router.post('/:id/record-installment', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            amount, 
            payment_method, 
            reference, 
            parent_name, 
            parent_phone, 
            notes 
        } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid amount is required'
            });
        }

        const customer = await customerService.findCustomerById(id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const installmentData = {
            customer_id: id,
            amount: parseFloat(amount),
            payment_method: payment_method || 'cash',
            reference: reference || `INST-${Date.now()}`,
            parent_name: parent_name || customer.parent_name || '',
            parent_phone: parent_phone || customer.parent_phone || '',
            notes: notes || '',
            recorded_by: req.user ? req.user.display_name : 'System'
        };

        const result = await customerService.recordInstallmentPayment(installmentData);

        console.log(`💳 Installment recorded: KES ${amount} for ${customer.name}`);

        res.json({
            success: true,
            message: 'Installment payment recorded successfully',
            installment: result.installment,
            customer_balance: result.new_balance,
            total_installments_paid: await customerService.getTotalInstallmentPaid(id)
        });
    } catch (error) {
        console.error('❌ Record installment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record installment payment',
            error: error.message
        });
    }
});

/**
 * GET /api/customers/:id/installment-payments
 * Get all installment payments for a customer
 */
router.get('/:id/installment-payments', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const customer = await customerService.findCustomerById(id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const installmentPayments = await customerService.getInstallmentPayments(id);
        const totalPaid = installmentPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const currentBalance = parseFloat(customer.balance) || 0;

        res.json({
            success: true,
            customer_id: id,
            customer_name: customer.name,
            installment_status: customer.installment_status || 'not_paid',
            current_balance: currentBalance,
            total_installments_paid: totalPaid,
            payment_method: customer.payment_method || 'installment',
            parent_name: customer.parent_name || '',
            parent_phone: customer.parent_phone || '',
            payments: installmentPayments,
            summary: {
                total_payments: installmentPayments.length,
                total_amount: totalPaid,
                remaining_balance: Math.max(0, currentBalance - totalPaid)
            }
        });
    } catch (error) {
        console.error('❌ Get installment payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch installment payments',
            error: error.message
        });
    }
});

// =============== 6. TRANSACTION HISTORY & LEDGER ===============

/**
 * GET /api/customers/:id/ledger
 * Get customer's debt ledger
 */
router.get('/:id/ledger', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const ledger = await customerService.getCustomerLedger(id);

        res.json({
            success: true,
            outstanding_balance: ledger.outstanding_balance,
            outstanding_debts: ledger.outstanding_debts,
            history: ledger.history,
            summary: ledger.summary
        });
    } catch (error) {
        console.error('❌ Ledger error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch ledger',
            error: error.message 
        });
    }
});

/**
 * GET /api/customers/:id/transactions
 * Get all customer transactions (sales, payments, adjustments)
 */
router.get('/:id/transactions', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const transactions = await customerService.getCustomerTransactions(id);

        res.json({ 
            success: true, 
            count: transactions.count,
            program_summary: transactions.program_summary,
            transactions: transactions.transactions 
        });
    } catch (error) {
        console.error('❌ Transactions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch transactions',
            error: error.message 
        });
    }
});

// =============== 7. BATCH OPERATIONS & CLASS MANAGEMENT ===============

/**
 * POST /api/customers/batch/create
 * Create multiple learners in batch
 */
router.post('/batch/create', requirePermission('customers'), async (req, res) => {
    try {
        const { learners, class_name, boarding_status, program_membership } = req.body;
        
        if (!learners || !Array.isArray(learners) || learners.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Learners array is required'
            });
        }

        const result = await customerService.batchCreateCustomers(
            learners, 
            class_name, 
            boarding_status, 
            program_membership
        );

        console.log(`✅ Batch created ${result.created_count} learners, ${result.error_count} errors`);

        res.json({
            success: true,
            message: `Batch creation completed: ${result.created_count} created, ${result.error_count} failed`,
            created_count: result.created_count,
            error_count: result.error_count,
            created_learners: result.created_learners,
            errors: result.errors
        });
    } catch (error) {
        console.error('❌ Batch create error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create learners in batch',
            error: error.message
        });
    }
});

/**
 * GET /api/customers/class/:className
 * Get all learners in a specific class with their details
 */
router.get('/class/:className', requirePermission('customers'), async (req, res) => {
    try {
        const { className } = req.params;
        const { program, boarding } = req.query;

        const customers = await customerService.getCustomersByClass(className, { program, boarding });

        // Calculate class statistics
        const classStats = {
            total: customers.length,
            boarders: customers.filter(c => c.boarding_status === 'Boarding').length,
            day_scholars: customers.filter(c => c.boarding_status === 'Day').length,
            program_A: customers.filter(c => c.program_membership === 'A').length,
            program_B: customers.filter(c => c.program_membership === 'B').length,
            total_items_cost: customers.reduce((sum, c) => sum + (parseFloat(c.total_items_cost) || 0), 0),
            total_paid: customers.reduce((sum, c) => sum + (parseFloat(c.amount_paid) || 0), 0),
            total_balance: customers.reduce((sum, c) => sum + (parseFloat(c.balance) || 0), 0)
        };

        res.json({
            success: true,
            class_name: className,
            statistics: classStats,
            learners: customers.map(customer => ({
                customer_id: customer.customer_id,
                name: customer.name,
                boarding_status: customer.boarding_status,
                program_membership: customer.program_membership,
                total_items_cost: parseFloat(customer.total_items_cost) || 0,
                amount_paid: parseFloat(customer.amount_paid) || 0,
                balance: parseFloat(customer.balance) || 0,
                payment_method: customer.payment_method,
                installment_status: customer.installment_status,
                parent_name: customer.parent_name,
                parent_phone: customer.parent_phone,
                notes: customer.notes,
                disbursement_notes: customer.disbursement_notes,
                last_payment_date: customer.last_payment_date
            }))
        });
    } catch (error) {
        console.error('❌ Get class learners error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch class learners',
            error: error.message
        });
    }
});

/**
 * POST /api/customers/batch/update-payment
 * Batch update payment information for a class
 */
router.post('/batch/update-payment', requirePermission('customers'), async (req, res) => {
    try {
        const { class_name, payment_method, payment_duration_months, notes } = req.body;

        if (!class_name) {
            return res.status(400).json({
                success: false,
                message: 'Class name is required'
            });
        }

        const result = await customerService.batchUpdatePaymentInfo(
            class_name, 
            payment_method, 
            payment_duration_months, 
            notes
        );

        console.log(`✅ Batch updated payment info for ${result.updated_count} learners in class ${class_name}`);

        res.json({
            success: true,
            message: `Payment information updated for ${result.updated_count} learners`,
            class_name,
            updated_count: result.updated_count,
            updates: {
                payment_method,
                payment_duration_months,
                notes
            }
        });
    } catch (error) {
        console.error('❌ Batch update payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to batch update payment information',
            error: error.message
        });
    }
});

// =============== 8. PROMOTION & CLASS CHANGE ENDPOINTS (NEW) ===============

/**
 * POST /api/customers/:id/promote
 * Promote a learner to next class
 */
router.post('/:id/promote', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            new_class, 
            promotion_type = 'yearly_promotion', 
            academic_year, 
            notes 
        } = req.body;

        if (!new_class) {
            return res.status(400).json({
                success: false,
                message: 'New class is required'
            });
        }

        if (!academic_year) {
            return res.status(400).json({
                success: false,
                message: 'Academic year is required'
            });
        }

        const promotedBy = req.user ? req.user.display_name : 'System';
        const result = await customerService.promoteLearner(
            id, 
            new_class, 
            promotion_type, 
            academic_year, 
            promotedBy,
            notes
        );

        console.log(`🎓 Learner promoted: ${id} to ${new_class}`);

        res.json({
            success: true,
            message: result.message,
            promotion: result.promotion,
            previous_class: result.previous_class,
            new_class: result.new_class
        });
    } catch (error) {
        console.error('❌ Promote learner error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to promote learner',
            error: error.message
        });
    }
});

/**
 * POST /api/customers/batch/promote
 * Batch promote an entire class
 */
router.post('/batch/promote', requirePermission('customers'), async (req, res) => {
    try {
        const { 
            current_class, 
            new_class, 
            academic_year, 
            exclude_ids = [] 
        } = req.body;

        if (!current_class || !new_class || !academic_year) {
            return res.status(400).json({
                success: false,
                message: 'Current class, new class, and academic year are required'
            });
        }

        const promotedBy = req.user ? req.user.display_name : 'System';
        const result = await customerService.batchPromoteClass(
            current_class, 
            new_class, 
            academic_year, 
            promotedBy, 
            exclude_ids
        );

        console.log(`🎓 Batch promotion: ${current_class} → ${new_class}`);

        res.json({
            success: true,
            message: result.message,
            batch_id: result.batch_id,
            promoted_count: result.promoted_count,
            failed_count: result.failed_count,
            errors: result.errors
        });
    } catch (error) {
        console.error('❌ Batch promote error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to batch promote class',
            error: error.message
        });
    }
});

/**
 * POST /api/customers/:id/change-class
 * Change learner's class (individual)
 */
router.post('/:id/change-class', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        const { new_class, notes } = req.body;

        if (!new_class) {
            return res.status(400).json({
                success: false,
                message: 'New class is required'
            });
        }

        const changedBy = req.user ? req.user.display_name : 'System';
        const result = await customerService.changeLearnerClass(id, new_class, notes, changedBy);

        console.log(`🔄 Class changed: ${id} to ${new_class}`);

        res.json({
            success: true,
            message: result.message,
            previous_class: result.previous_class,
            new_class: result.new_class
        });
    } catch (error) {
        console.error('❌ Change class error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change learner class',
            error: error.message
        });
    }
});

/**
 * GET /api/customers/:id/promotion-history
 * Get promotion history for a learner
 */
router.get('/:id/promotion-history', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const customer = await customerService.findCustomerById(id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Fixed: Use db.query instead of direct database access
        const result = await db.query(
            `SELECT * FROM promotion_history 
             WHERE customer_id = $1 
             ORDER BY promotion_date DESC`,
            [id]
        );

        res.json({
            success: true,
            customer_id: id,
            customer_name: customer.name,
            current_class: customer.class,
            previous_class: customer.previous_class,
            promotion_date: customer.promotion_date,
            history: result.rows
        });
    } catch (error) {
        console.error('❌ Get promotion history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch promotion history',
            error: error.message
        });
    }
});

/**
 * GET /api/customers/:id/disbursement-history
 * Get all items disbursed to a learner with payment tracking
 */
router.get('/:id/disbursement-history', requirePermission('customers'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const customer = await customerService.findCustomerById(id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const history = await customerService.getDisbursementHistory(id);

        res.json({
            success: true,
            customer_id: id,
            customer_name: customer.name,
            program_membership: customer.program_membership,
            boarding_status: customer.boarding_status,
            financial_summary: {
                total_items_cost: parseFloat(customer.total_items_cost) || 0,
                amount_paid: parseFloat(customer.amount_paid) || 0,
                current_balance: parseFloat(customer.balance) || 0,
                calculated_balance: history.summary.calculated_balance,
                total_disbursed: history.summary.total_disbursed,
                total_payments: history.summary.total_paid,
                payment_method: customer.payment_method,
                installment_status: customer.installment_status
            },
            guardian: {
                parent_name: customer.parent_name,
                parent_phone: customer.parent_phone,
                guardian_address: customer.guardian_address,
                guardian_email: customer.guardian_email
            },
            disbursements: history.disbursements,
            payments: history.payments,
            allocation_history: history.allocation_history,
            notes: customer.notes,
            disbursement_notes: customer.disbursement_notes,
            class_teacher: customer.class_teacher,
            last_payment_date: customer.last_payment_date,
            next_payment_due: customer.next_payment_due
        });
    } catch (error) {
        console.error('❌ Get disbursement history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch disbursement history',
            error: error.message
        });
    }
});

module.exports = router;