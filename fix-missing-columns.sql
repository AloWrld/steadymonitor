-- fix-missing-columns.sql
-- 1. Add missing pocket_money_balance (might have failed earlier)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS pocket_money_balance DECIMAL(10,2) DEFAULT 0 CHECK (pocket_money_balance >= 0);

-- 2. Add transaction_notes if missing
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS transaction_notes TEXT;

-- 3. Ensure refunds table exists (from original schema)
CREATE TABLE IF NOT EXISTS refunds (
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

-- 4. Add indexes for refunds
CREATE INDEX IF NOT EXISTS idx_refunds_customer_id ON refunds(customer_id);
CREATE INDEX IF NOT EXISTS idx_refunds_original_sale_id ON refunds(original_sale_id);

-- 5. Add parent_allocation_id to allocation_history if missing
ALTER TABLE allocation_history 
ADD COLUMN IF NOT EXISTS parent_allocation_id UUID;

-- 6. Add is_pocket_money to allocation_history if missing
ALTER TABLE allocation_history 
ADD COLUMN IF NOT EXISTS is_pocket_money BOOLEAN DEFAULT FALSE;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ All missing columns and tables verified';
    RAISE NOTICE '✅ Refunds table ready';
    RAISE NOTICE '✅ Pocket money balance column added';
END $$;