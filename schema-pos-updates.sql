-- schema-pos-updates.sql
-- =============================================
-- UPDATES FOR POS SYSTEM MIGRATION
-- =============================================

-- 1. ENHANCE ALLOCATION_HISTORY FOR DISBURSEMENTS
ALTER TABLE allocation_history 
ADD COLUMN IF NOT EXISTS is_allocation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS program_type VARCHAR(10) DEFAULT 'none'
    CHECK (program_type IN ('A', 'B', 'pocket_money', 'none')),
ADD COLUMN IF NOT EXISTS parent_allocation_id UUID,
ADD COLUMN IF NOT EXISTS is_pocket_money BOOLEAN DEFAULT FALSE;

-- 2. ADD POCKET MONEY SUPPORT TO CUSTOMERS
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS pocket_money_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pocket_money_balance DECIMAL(10,2) DEFAULT 0 CHECK (pocket_money_balance >= 0);

-- 3. ENHANCE SALES FOR TRANSACTION TYPE TRACKING
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS sale_type VARCHAR(50) DEFAULT 'normal'
    CHECK (sale_type IN ('normal', 'pocket_money', 'allocation', 'payment')),
ADD COLUMN IF NOT EXISTS transaction_notes TEXT,
ADD COLUMN IF NOT EXISTS program_type VARCHAR(10);

-- 4. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_department_active ON products(department, active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sales_customer_type ON sales(customer_id, sale_type);
CREATE INDEX IF NOT EXISTS idx_allocation_history_customer_date ON allocation_history(customer_id, given_date DESC);

-- 5. ADD HELPER VIEW FOR DEPARTMENT PRODUCTS
CREATE OR REPLACE VIEW department_products AS
SELECT 
    product_id,
    sku,
    name,
    description,
    department,
    category,
    buy_price,
    sell_price,
    stock_qty,
    reorder_level,
    supplier_id,
    is_allocatable,
    active
FROM products
WHERE active = TRUE
ORDER BY department, category, name;

-- 6. ADD VIEW FOR LEARNER BALANCE SUMMARY
CREATE OR REPLACE VIEW learner_balance_summary AS
SELECT 
    c.customer_id,
    c.name,
    c.class,
    c.boarding_status,
    c.program_membership,
    c.pocket_money_enabled,
    c.pocket_money_balance,
    c.total_items_cost,
    c.amount_paid,
    c.balance,
    COUNT(DISTINCT s.sale_id) as total_transactions,
    MAX(s.date) as last_transaction_date
FROM customers c
LEFT JOIN sales s ON c.customer_id = s.customer_id AND s.status = 'completed'
GROUP BY c.customer_id, c.name, c.class, c.boarding_status, c.program_membership, 
         c.pocket_money_enabled, c.pocket_money_balance, c.total_items_cost, 
         c.amount_paid, c.balance;

-- VERIFICATION
DO $$
BEGIN
    RAISE NOTICE '✅ POS schema updates completed successfully';
    RAISE NOTICE '✅ Enhanced allocation_history for disbursements';
    RAISE NOTICE '✅ Added pocket money support';
    RAISE NOTICE '✅ Created performance indexes';
    RAISE NOTICE '✅ Ready for POS system conversion';
END $$;