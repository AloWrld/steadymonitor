--schema-enhanced.sql
-- =============================================
-- STEADYMONITOR POSTGRESQL DATABASE SCHEMA
-- =============================================
-- This schema mirrors the ExcelService.js structure
-- Includes foreign keys, indexes, and triggers for data integrity
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============== PRODUCTS ===============
-- Products (mirrors Products sheet)
CREATE TABLE products (
    product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    department VARCHAR(50) NOT NULL DEFAULT 'General',
    category VARCHAR(50) NOT NULL DEFAULT 'Uncategorized',
    buy_price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (buy_price >= 0),
    sell_price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (sell_price >= 0),
    stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    reorder_level INTEGER NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
    supplier_id UUID,
    is_allocatable BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure profit margin is reasonable (sell_price >= buy_price)
    CONSTRAINT chk_profit_margin CHECK (sell_price >= buy_price)
);

-- Indexes for products
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_department ON products(department);
CREATE INDEX idx_products_active ON products(active) WHERE active = TRUE;
CREATE INDEX idx_products_low_stock ON products(stock_qty) WHERE stock_qty <= reorder_level;

-- =============== CUSTOMERS (LEARNERS) ===============
-- Customers/Learners (mirrors Customers sheet)
CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    class VARCHAR(50),
    boarding_status VARCHAR(20) NOT NULL DEFAULT 'Day' 
        CHECK (boarding_status IN ('Day', 'Boarding')),
    program_membership VARCHAR(10),
    
    -- Program specific totals
    program_a_total DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (program_a_total >= 0),
    program_b_total DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (program_b_total >= 0),
    program_a_balance DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (program_a_balance >= 0),
    program_b_balance DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (program_b_balance >= 0),
    
    -- Payment tracking
    total_items_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_items_cost >= 0),
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'partially_paid', 'paid', 'overdue')),
    
    -- Guardian details
    contact VARCHAR(20),
    email VARCHAR(255),
    parent_name VARCHAR(255),
    parent_phone VARCHAR(20),
    guardian_address TEXT,
    guardian_email VARCHAR(255),
    
    -- Payment details
    payment_method VARCHAR(50) NOT NULL DEFAULT 'installment'
        CHECK (payment_method IN ('cash', 'mpesa', 'card', 'installment', 'bank_transfer')),
    payment_duration_months INTEGER NOT NULL DEFAULT 3 CHECK (payment_duration_months >= 0),
    installment_status VARCHAR(20) NOT NULL DEFAULT 'not_paid'
        CHECK (installment_status IN ('not_paid', 'partially_paid', 'paid')),
    last_payment_date TIMESTAMP WITH TIME ZONE,
    next_payment_due TIMESTAMP WITH TIME ZONE,
    
    -- Calculated fields (will be auto-maintained)
    total_invoiced DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_invoiced >= 0),
    total_paid DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_paid >= 0),
    
    -- Notes and metadata
    notes TEXT,
    disbursement_notes TEXT,
    class_teacher VARCHAR(255),
    admission_number VARCHAR(50) UNIQUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_balance_calculation CHECK (
        balance = GREATEST(0, total_invoiced - total_paid)
    ),
    CONSTRAINT chk_program_balances CHECK (
        program_a_balance <= program_a_total AND 
        program_b_balance <= program_b_total
    )
);

-- Indexes for customers
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_class ON customers(class);
CREATE INDEX idx_customers_parent_phone ON customers(parent_phone);
CREATE INDEX idx_customers_admission_number ON customers(admission_number);
CREATE INDEX idx_customers_program_membership ON customers(program_membership);
CREATE INDEX idx_customers_payment_status ON customers(payment_status);
CREATE INDEX idx_customers_balance ON customers(balance) WHERE balance > 0;

-- =============== SUPPLIERS ===============
CREATE TABLE suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(20),
    email VARCHAR(255),
    products_supplied TEXT,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key to products
ALTER TABLE products 
ADD CONSTRAINT fk_products_supplier 
FOREIGN KEY (supplier_id) 
REFERENCES suppliers(supplier_id) 
ON DELETE SET NULL;

-- =============== SALES ===============
CREATE TABLE sales (
    sale_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    department VARCHAR(50) NOT NULL,
    served_by VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
    customer_type VARCHAR(50) NOT NULL DEFAULT 'Walk-in'
        CHECK (customer_type IN ('Walk-in', 'Learner', 'Batch')),
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'cash'
        CHECK (payment_mode IN ('cash', 'mpesa', 'card', 'bank_transfer', 'batch')),
    total DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    paid DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (paid >= 0),
    balance DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    discount_reason TEXT,
    reference_id VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'completed'
        CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded', 'pending_payment')),
    sale_type VARCHAR(50) NOT NULL DEFAULT 'normal'
        CHECK (sale_type IN ('normal', 'batch_allocation', 'disbursement', 'special')),
    batch_id UUID,
    invoice_number VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_sale_balance CHECK (balance = total - paid - discount_amount),
    CONSTRAINT chk_paid_amount CHECK (paid <= total)
);

-- Indexes for sales
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_department ON sales(department);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_batch_id ON sales(batch_id);
CREATE INDEX idx_sales_invoice_number ON sales(invoice_number);

-- =============== SALE ITEMS ===============
CREATE TABLE sale_items (
    sale_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(product_id),
    sku VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    cost_price DECIMAL(10,2) NOT NULL CHECK (cost_price >= 0),
    department VARCHAR(50) NOT NULL,
    sale_type VARCHAR(50),
    batch_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Calculated field
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
    profit DECIMAL(10,2) GENERATED ALWAYS AS (qty * (unit_price - cost_price)) STORED
);

-- Indexes for sale_items
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX idx_sale_items_batch_id ON sale_items(batch_id);

-- =============== PAYMENTS ===============
CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(sale_id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL DEFAULT 'cash'
        CHECK (method IN ('cash', 'mpesa', 'card', 'bank_transfer', 'cheque', 'batch_adjustment')),
    reference VARCHAR(100),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_installment BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'completed'
        CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
    notes TEXT,
    invoice_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for payments
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_date ON payments(date);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);

-- =============== INVOICES ===============
CREATE TABLE invoices (
    invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    discount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    paid DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (paid >= 0),
    balance DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    payment_terms TEXT,
    program_type VARCHAR(10)
        CHECK (program_type IN ('A', 'B', 'both', 'none')),
    batch_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_invoice_balance CHECK (balance = total - paid),
    CONSTRAINT chk_invoice_total CHECK (total = subtotal + tax - discount)
);

-- Indexes for invoices
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_program_type ON invoices(program_type);
CREATE INDEX idx_invoices_batch_id ON invoices(batch_id);

-- =============== INVOICE ITEMS ===============
CREATE TABLE invoice_items (
    invoice_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(product_id),
    sku VARCHAR(50),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for invoice_items
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- =============== BATCHES ===============
CREATE TABLE batches (
    batch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_name VARCHAR(255) NOT NULL,
    class VARCHAR(50) NOT NULL,
    program_type VARCHAR(10) NOT NULL
        CHECK (program_type IN ('A', 'B')),
    total_items INTEGER NOT NULL DEFAULT 0 CHECK (total_items >= 0),
    total_value DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_value >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processed', 'cancelled')),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for batches
CREATE INDEX idx_batches_class ON batches(class);
CREATE INDEX idx_batches_program_type ON batches(program_type);
CREATE INDEX idx_batches_status ON batches(status);

-- =============== BATCH ITEMS ===============
CREATE TABLE batch_items (
    batch_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(product_id),
    sku VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    department VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for batch_items
CREATE INDEX idx_batch_items_batch_id ON batch_items(batch_id);

-- =============== ALLOCATIONS ===============
CREATE TABLE allocations (
    allocation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_class VARCHAR(50) NOT NULL,
    product_id UUID NOT NULL REFERENCES products(product_id),
    sku VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    frequency VARCHAR(50) NOT NULL DEFAULT 'termly'
        CHECK (frequency IN ('daily', 'weekly', 'monthly', 'termly', 'yearly', 'once_per_term')),
    allocation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    term VARCHAR(50) NOT NULL DEFAULT 'Term 1',
    academic_year VARCHAR(20) NOT NULL,
    program_type VARCHAR(10) NOT NULL
        CHECK (program_type IN ('A', 'B', 'none')),
    allocated_by VARCHAR(255) NOT NULL,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'allocated'
        CHECK (status IN ('allocated', 'disbursed', 'cancelled', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for allocations
CREATE INDEX idx_allocations_customer_id ON allocations(customer_id);
CREATE INDEX idx_allocations_program_type ON allocations(program_type);
CREATE INDEX idx_allocations_status ON allocations(status);
CREATE INDEX idx_allocations_allocation_date ON allocations(allocation_date);

-- =============== ALLOCATION HISTORY ===============
CREATE TABLE allocation_history (
    history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_class VARCHAR(50) NOT NULL,
    allocation_id UUID REFERENCES allocations(allocation_id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(product_id),
    sku VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    program_type VARCHAR(10) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    given_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    given_by VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for allocation_history
CREATE INDEX idx_allocation_history_customer_id ON allocation_history(customer_id);
CREATE INDEX idx_allocation_history_given_date ON allocation_history(given_date);

-- =============== PROGRAM DEFINITIONS ===============
CREATE TABLE program_definitions (
    program_id VARCHAR(50) PRIMARY KEY,
    program_name VARCHAR(255) NOT NULL,
    program_type VARCHAR(10) NOT NULL UNIQUE
        CHECK (program_type IN ('A', 'B')),
    description TEXT,
    department VARCHAR(50) NOT NULL DEFAULT 'Stationery',
    default_items JSONB NOT NULL DEFAULT '[]',
    price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    terms TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default programs
INSERT INTO program_definitions (program_id, program_name, program_type, description, department, default_items, price, terms, active) VALUES
('PROG-A', 'Full Stationery Program', 'A', 'Complete stationery allocation for boarding students', 'Stationery', 
 '[{"sku": "STN-001", "quantity": 10, "name": "Exercise Books"}, {"sku": "STN-002", "quantity": 1, "name": "Mathematics Set"}, {"sku": "STN-003", "quantity": 5, "name": "Pens"}, {"sku": "STN-004", "quantity": 2, "name": "Pencils"}]',
 2500.00, 'Payable at beginning of term', TRUE),
('PROG-B', 'Exercise Books & Essentials', 'B', 'Exercise books and basic essentials only', 'Stationery',
 '[{"sku": "STN-001", "quantity": 5, "name": "Exercise Books"}, {"sku": "STN-003", "quantity": 2, "name": "Pens"}, {"sku": "STN-004", "quantity": 1, "name": "Pencil"}]',
 800.00, 'Payable at beginning of term', TRUE);

-- =============== SUPPLIER CREDITS ===============
CREATE TABLE supplier_credits (
    credit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    restock_id UUID,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    original_amount DECIMAL(10,2) NOT NULL CHECK (original_amount > 0),
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'unpaid'
        CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'overdue')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for supplier_credits
CREATE INDEX idx_supplier_credits_supplier_id ON supplier_credits(supplier_id);
CREATE INDEX idx_supplier_credits_status ON supplier_credits(status);

-- =============== SUPPLIER PAYMENTS ===============
CREATE TABLE supplier_payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL,
    reference VARCHAR(100),
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by VARCHAR(255) NOT NULL,
    notes TEXT,
    applied_to_credits DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (applied_to_credits >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'completed'
        CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for supplier_payments
CREATE INDEX idx_supplier_payments_supplier_id ON supplier_payments(supplier_id);

-- =============== RESTOCKS ===============
CREATE TABLE restocks (
    restock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_cost DECIMAL(10,2) NOT NULL CHECK (total_cost >= 0),
    expected_profit DECIMAL(10,2) NOT NULL CHECK (expected_profit >= 0),
    recorded_by VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_payment'
        CHECK (status IN ('pending_payment', 'paid', 'partial_payment')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for restocks
CREATE INDEX idx_restocks_supplier_id ON restocks(supplier_id);

-- =============== INSTALLMENT PAYMENTS ===============
CREATE TABLE installment_payments (
    installment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    parent_name VARCHAR(255) NOT NULL,
    parent_phone VARCHAR(20) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference VARCHAR(100),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for installment_payments
CREATE INDEX idx_installment_payments_customer_id ON installment_payments(customer_id);
CREATE INDEX idx_installment_payments_payment_date ON installment_payments(payment_date);

-- =============== DEBTS ===============
CREATE TABLE debts (
    debt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(sale_id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    balance DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    agreement_details TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_debt_balance CHECK (balance = total_amount - paid_amount)
);

-- Indexes for debts
CREATE INDEX idx_debts_customer_id ON debts(customer_id);
CREATE INDEX idx_debts_status ON debts(status);

-- =============== REFUNDS ===============
CREATE TABLE refunds (
    refund_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_sale_id UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(product_id),
    sku VARCHAR(50),
    amount_returned DECIMAL(10,2) NOT NULL CHECK (amount_returned > 0),
    reason TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_by VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed'
        CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for refunds
CREATE INDEX idx_refunds_customer_id ON refunds(customer_id);
CREATE INDEX idx_refunds_original_sale_id ON refunds(original_sale_id);

-- =============== DISBURSEMENTS ===============
CREATE TABLE disbursements (
    disbursement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_disbursement_id UUID REFERENCES disbursements(disbursement_id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    class VARCHAR(50) NOT NULL,
    product_id UUID NOT NULL REFERENCES products(product_id),
    sku VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    is_allocation BOOLEAN NOT NULL DEFAULT FALSE,
    program_type VARCHAR(10)
        CHECK (program_type IN ('A', 'B', 'none')),
    notes TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for disbursements
CREATE INDEX idx_disbursements_customer_id ON disbursements(customer_id);
CREATE INDEX idx_disbursements_date ON disbursements(date);

-- =============================================
-- TRIGGERS AND FUNCTIONS FOR DATA INTEGRITY
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_allocations_updated_at BEFORE UPDATE ON allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON debts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_credits_updated_at BEFORE UPDATE ON supplier_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update customer balance when payment is made
CREATE OR REPLACE FUNCTION update_customer_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Update customer's total_paid
    UPDATE customers 
    SET total_paid = total_paid + NEW.amount,
        amount_paid = amount_paid + NEW.amount,
        balance = GREATEST(0, total_invoiced - (total_paid + NEW.amount)),
        last_payment_date = NEW.date,
        updated_at = NOW()
    WHERE customer_id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_customer_balance 
AFTER INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION update_customer_balance_on_payment();

-- Function to update product stock when sale item is added
CREATE OR REPLACE FUNCTION update_product_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products 
    SET stock_qty = stock_qty - NEW.qty,
        updated_at = NOW()
    WHERE product_id = NEW.product_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_product_stock 
AFTER INSERT ON sale_items
FOR EACH ROW EXECUTE FUNCTION update_product_stock_on_sale();

-- Function to restore product stock on refund
CREATE OR REPLACE FUNCTION restore_product_stock_on_refund()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products 
    SET stock_qty = stock_qty + (
        SELECT quantity FROM refunds 
        WHERE refund_id = NEW.refund_id
    ),
    updated_at = NOW()
    WHERE product_id = NEW.product_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_restore_product_stock 
AFTER INSERT ON refunds
FOR EACH ROW EXECUTE FUNCTION restore_product_stock_on_refund();

-- Function to update sale balance when payment is made
CREATE OR REPLACE FUNCTION update_sale_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sales 
    SET paid = paid + NEW.amount,
        balance = GREATEST(0, total - (paid + NEW.amount) - discount_amount),
        updated_at = NOW()
    WHERE sale_id = NEW.sale_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_sale_balance 
AFTER INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION update_sale_balance_on_payment();

-- =============================================
-- VIEWS FOR REPORTING
-- =============================================

-- View for low stock products
CREATE VIEW low_stock_products AS
SELECT 
    product_id,
    sku,
    name,
    department,
    stock_qty,
    reorder_level,
    CASE 
        WHEN stock_qty = 0 THEN 'Out of Stock'
        WHEN stock_qty <= reorder_level THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status
FROM products 
WHERE active = TRUE AND stock_qty <= reorder_level;

-- View for customers with outstanding balances
CREATE VIEW customers_with_outstanding_balance AS
SELECT 
    customer_id,
    name,
    class,
    admission_number,
    parent_name,
    parent_phone,
    balance,
    payment_status,
    program_membership,
    program_a_balance,
    program_b_balance,
    (program_a_balance + program_b_balance) as total_program_balance
FROM customers 
WHERE balance > 0 OR program_a_balance > 0 OR program_b_balance > 0
ORDER BY balance DESC;

-- View for daily sales summary
CREATE VIEW daily_sales_summary AS
SELECT 
    DATE(date) as sale_date,
    department,
    COUNT(*) as total_sales,
    SUM(total) as total_revenue,
    SUM(paid) as total_paid,
    SUM(balance) as total_balance,
    AVG(total) as average_sale_amount
FROM sales 
WHERE status = 'completed'
GROUP BY DATE(date), department
ORDER BY sale_date DESC;

-- View for batch allocation summary
CREATE VIEW batch_allocation_summary AS
SELECT 
    b.batch_id,
    b.batch_name,
    b.class,
    b.program_type,
    b.total_items,
    b.total_value,
    b.status,
    b.created_at,
    COUNT(DISTINCT a.customer_id) as total_learners,
    COUNT(DISTINCT bi.product_id) as unique_products
FROM batches b
LEFT JOIN allocations a ON b.batch_id = a.allocation_id::text::uuid
LEFT JOIN batch_items bi ON b.batch_id = bi.batch_id
GROUP BY b.batch_id, b.batch_name, b.class, b.program_type, b.total_items, b.total_value, b.status, b.created_at;

-- =============================================
-- MIGRATION HELPER FUNCTIONS
-- =============================================

-- Function to migrate Excel data (to be called from migration script)
CREATE OR REPLACE FUNCTION migrate_excel_data()
RETURNS void AS $$
BEGIN
    -- This function will be populated by the migration script
    RAISE NOTICE 'Migration function placeholder. Run the Node.js migration script instead.';
END;
$$ language 'plpgsql';

-- =============================================
-- COMMENT ON TABLES FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE products IS 'Store inventory items with pricing and stock levels';
COMMENT ON TABLE customers IS 'Learners/customers with program enrollment and payment details';
COMMENT ON TABLE sales IS 'Sales transactions including walk-in and learner sales';
COMMENT ON TABLE sale_items IS 'Individual items within each sale';
COMMENT ON TABLE payments IS 'Payment records for sales and invoices';
COMMENT ON TABLE invoices IS 'Invoices generated for learner program enrollments';
COMMENT ON TABLE batches IS 'Batch operations for class-wide allocations';
COMMENT ON TABLE allocations IS 'Items allocated to specific learners';
COMMENT ON TABLE suppliers IS 'Product suppliers with credit tracking';
COMMENT ON TABLE program_definitions IS 'Definition of learner programs A and B';

-- =============================================
-- GRANT PERMISSIONS (Adjust based on your user)
-- =============================================

-- Example: Grant permissions to application user
-- CREATE USER steadymonitor_user WITH PASSWORD 'your_password';
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO steadymonitor_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO steadymonitor_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO steadymonitor_user;

-- =============================================
-- DATABASE SETTINGS FOR PERFORMANCE
-- =============================================

-- Run these after creating the database
-- ALTER DATABASE steadymonitor SET random_page_cost = 1.1;
-- ALTER DATABASE steadymonitor SET effective_cache_size = '4GB';
-- ALTER DATABASE steadymonitor SET maintenance_work_mem = '256MB';
-- ALTER DATABASE steadymonitor SET work_mem = '32MB';

RAISE NOTICE '✅ PostgreSQL schema created successfully!';
RAISE NOTICE 'Run the migration script to import your Excel data.';