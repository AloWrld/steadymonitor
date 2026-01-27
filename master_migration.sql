-- =============================================
-- MASTER POS & EXCEL MIGRATION SCRIPT
-- Includes:
-- 1. schema-pos-updates.sql
-- 2. schema-updates1.sql
-- 3. schema-updates2.sql
-- 4. verify_migration.sql
-- =============================================

-- =============================================
-- STEP 1: POS UPDATES
-- (schema-pos-updates.sql)
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

-- =============================================
-- STEP 2: EXCEL LOGIC MIGRATION PART 1
-- (schema-updates1.sql)
-- =============================================

-- 1. CUSTOMERS TABLE UPDATES
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS allocation_program VARCHAR(50),
ADD COLUMN IF NOT EXISTS exercise_book_program BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allocation_frequency_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS disbursement_notes TEXT,
ADD COLUMN IF NOT EXISTS previous_class VARCHAR(50),
ADD COLUMN IF NOT EXISTS promotion_date TIMESTAMP WITH TIME ZONE;

UPDATE customers 
SET program_membership = 
  CASE 
    WHEN program_membership LIKE '%C%' THEN 
      REPLACE(REPLACE(REPLACE(program_membership, 'C', ''), ',,', ','), '^,|,$', '')
    ELSE program_membership 
  END
WHERE program_membership LIKE '%C%';

UPDATE customers 
SET program_membership = 
  CASE 
    WHEN program_membership LIKE '%A%' THEN 'A'
    WHEN program_membership LIKE '%B%' THEN 'B'
    ELSE 'none'
  END;

ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS customers_program_membership_check;

ALTER TABLE customers 
ADD CONSTRAINT customers_program_membership_check 
CHECK (program_membership IN ('A', 'B', 'none'));

-- 2. SALES TABLE ENHANCEMENTS
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS sale_notes TEXT,
ADD COLUMN IF NOT EXISTS is_special_sale BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS special_sale_type VARCHAR(50) DEFAULT 'normal'
    CHECK (special_sale_type IN ('normal', 'pocket_money', 'notes', 'disbursement', 'other'));

-- 3. ALLOCATIONS TABLE UPDATES
ALTER TABLE allocations 
ADD COLUMN IF NOT EXISTS next_due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS specific_days VARCHAR(100),
ADD COLUMN IF NOT EXISTS given_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE allocations 
DROP CONSTRAINT IF EXISTS allocations_frequency_check;

ALTER TABLE allocations 
ADD CONSTRAINT allocations_frequency_check 
CHECK (frequency IN ('daily', 'weekly', 'monthly', 'termly', 'yearly', 'once_per_term', 'specific_days', 'class_schedule'));

-- 4. PROGRAM DEFINITIONS CLEANUP
DELETE FROM program_definitions WHERE program_type NOT IN ('A', 'B');

ALTER TABLE program_definitions 
ADD CONSTRAINT chk_program_type 
CHECK (program_type IN ('A', 'B'));

-- 5. CREATE PROMOTION HISTORY TABLE
CREATE TABLE IF NOT EXISTS promotion_history (
    promotion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    previous_class VARCHAR(50) NOT NULL,
    new_class VARCHAR(50) NOT NULL,
    promotion_type VARCHAR(50) NOT NULL 
        CHECK (promotion_type IN ('yearly_promotion', 'class_change', 'demotion', 'batch_promotion')),
    promotion_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    academic_year VARCHAR(20) NOT NULL,
    term VARCHAR(50) DEFAULT 'Term 1',
    notes TEXT,
    promoted_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotion_history_customer_id ON promotion_history(customer_id);  
CREATE INDEX IF NOT EXISTS idx_promotion_history_date ON promotion_history(promotion_date);      
CREATE INDEX IF NOT EXISTS idx_promotion_history_class ON promotion_history(new_class);

-- 6. BATCH OPERATIONS SUPPORT
ALTER TABLE batches 
ADD COLUMN IF NOT EXISTS operation_type VARCHAR(50) DEFAULT 'allocation'
    CHECK (operation_type IN ('allocation', 'promotion', 'disbursement', 'payment_update')),
ADD COLUMN IF NOT EXISTS target_class VARCHAR(50),
ADD COLUMN IF NOT EXISTS new_class VARCHAR(50);

-- 7. VIEW FOR CLASS MANAGEMENT
CREATE OR REPLACE VIEW class_management_view AS
SELECT 
    c.class,
    COUNT(*) as total_learners,
    COUNT(CASE WHEN c.boarding_status = 'Boarding' THEN 1 END) as boarders,
    COUNT(CASE WHEN c.boarding_status = 'Day' THEN 1 END) as day_scholars,
    COUNT(CASE WHEN c.program_membership = 'A' THEN 1 END) as program_a_count,
    COUNT(CASE WHEN c.program_membership = 'B' THEN 1 END) as program_b_count,
    SUM(c.balance) as total_balance,
    AVG(c.balance) as average_balance,
    STRING_AGG(DISTINCT c.program_membership, ', ') as programs_in_class,
    MAX(c.updated_at) as last_update
FROM customers c
WHERE c.class IS NOT NULL AND c.class <> ''
GROUP BY c.class
ORDER BY 
    CASE 
        WHEN c.class ~ '^Form (\d+)' THEN CAST(SUBSTRING(c.class FROM 'Form (\d+)') AS INTEGER)
        WHEN c.class ~ '^Class (\d+)' THEN CAST(SUBSTRING(c.class FROM 'Class (\d+)') AS INTEGER)
        ELSE 99
    END,
    c.class;

-- 8. FUNCTIONS FOR PROMOTION & BATCH PROMOTION
-- promote_learner & batch_promote_class
-- (Copied from schema-updates1.sql and fixed later in step 3)

-- 9. TRIGGER FOR CLASS CHANGE AUDITING
-- audit_class_change trigger (will be finalized in step 3)

-- 10. CUSTOMER STATISTICS VIEW
CREATE OR REPLACE VIEW customer_statistics AS
SELECT 
    program_membership,
    boarding_status,
    COUNT(*) as total_customers,
    SUM(balance) as total_balance,
    AVG(balance) as average_balance,
    COUNT(CASE WHEN balance > 0 THEN 1 END) as customers_with_balance,
    COUNT(CASE WHEN installment_status = 'not_paid' THEN 1 END) as installment_not_paid,
    COUNT(CASE WHEN installment_status = 'partially_paid' THEN 1 END) as installment_partial,
    COUNT(CASE WHEN installment_status = 'fully_paid' THEN 1 END) as installment_paid
FROM customers
GROUP BY program_membership, boarding_status
ORDER BY program_membership, boarding_status;

DO $$
BEGIN
    RAISE NOTICE '✅ schema-updates1.sql executed';
END $$;

-- =============================================
-- STEP 3: EXCEL LOGIC MIGRATION PART 2 / FIXES
-- (schema-updates2.sql)
-- =============================================

-- Re-apply and fix promote_learner function
-- Re-apply and fix batch_promote_class function
-- Re-apply audit_class_change trigger
-- Re-verify customer_statistics view
-- (All included here, fully consolidated)

-- PROMOTE LEARNER FUNCTION
CREATE OR REPLACE FUNCTION promote_learner(
    p_customer_id UUID,
    p_new_class VARCHAR(50),
    p_promotion_type VARCHAR(50),
    p_academic_year VARCHAR(20),
    p_promoted_by VARCHAR(255),
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_customer RECORD;
BEGIN
    SELECT * INTO v_customer
    FROM customers
    WHERE customer_id = p_customer_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Customer not found'
        );
    END IF;

    INSERT INTO promotion_history (
        customer_id,
        previous_class,
        new_class,
        promotion_type,
        academic_year,
        notes,
        promoted_by
    ) VALUES (
        p_customer_id,
        v_customer.class,
        p_new_class,
        p_promotion_type,
        p_academic_year,
        p_notes,
        p_promoted_by
    );

    UPDATE customers
    SET
        class = p_new_class,
        previous_class = v_customer.class,
        promotion_date = NOW(),
        updated_at = NOW()
    WHERE customer_id = p_customer_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Promoted %s from %s to %s', v_customer.name, v_customer.class, p_new_class),
        'customer_id', p_customer_id,
        'previous_class', v_customer.class,
        'new_class', p_new_class,
        'promotion_type', p_promotion_type
    );
END;
$$ LANGUAGE plpgsql;

-- BATCH PROMOTION FUNCTION
CREATE OR REPLACE FUNCTION batch_promote_class(
    p_current_class VARCHAR(50),
    p_new_class VARCHAR(50),
    p_academic_year VARCHAR(20),
    p_promoted_by VARCHAR(255),
    p_exclude_ids UUID[] DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_learners RECORD;
    v_promoted_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
BEGIN
    INSERT INTO batches (
        batch_name,
        class,
        operation_type,
        target_class,
        new_class,
        created_by
    ) VALUES (
        format('Promotion: %s → %s (%s)', p_current_class, p_new_class, p_academic_year),
        p_current_class,
        'promotion',
        p_current_class,
        p_new_class,
        p_promoted_by
    );

    FOR v_learners IN
        SELECT * FROM customers
        WHERE class = p_current_class
        AND (p_exclude_ids IS NULL OR customer_id != ALL(p_exclude_ids))
    LOOP
        BEGIN
            INSERT INTO promotion_history (
                customer_id,
                previous_class,
                new_class,
                promotion_type,
                academic_year,
                promoted_by
            ) VALUES (
                v_learners.customer_id,
                v_learners.class,
                p_new_class,
                'batch_promotion',
                p_academic_year,
                p_promoted_by
            );

            UPDATE customers
            SET
                class = p_new_class,
                previous_class = v_learners.class,
                promotion_date = NOW(),
                updated_at = NOW()
            WHERE customer_id = v_learners.customer_id;

            v_promoted_count := v_promoted_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_failed_count := v_failed_count + 1;
            v_errors := v_errors || jsonb_build_object(
                'customer_id', v_learners.customer_id,
                'name', v_learners.name,
                'error', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Batch promotion completed: %s promoted, %s failed', v_promoted_count, v_failed_count),
        'current_class', p_current_class,
        'new_class', p_new_class,
        'promoted_count', v_promoted_count,
        'failed_count', v_failed_count,
        'errors', v_errors
    );
END;
$$ LANGUAGE plpgsql;

-- TRIGGER FOR CLASS CHANGE AUDITING
CREATE OR REPLACE FUNCTION audit_class_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.class IS DISTINCT FROM NEW.class THEN
        INSERT INTO promotion_history (
            customer_id,
            previous_class,
            new_class,
            promotion_type,
            academic_year,
            promoted_by,
            notes
        ) VALUES (
            NEW.customer_id,
            OLD.class,
            NEW.class,
            'class_change',
            EXTRACT(YEAR FROM NOW())::VARCHAR,
            'system',
            format('Class changed via customer update. Previous balance: %s', OLD.balance)       
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_class_change
AFTER UPDATE OF class ON customers
FOR EACH ROW
EXECUTE FUNCTION audit_class_change();

DO $$
BEGIN
    RAISE NOTICE '✅ schema-updates2.sql executed';
END $$;

-- =============================================
-- STEP 4: POST-MIGRATION VERIFICATION
-- (verify_migration.sql)
-- =============================================

-- Verify row counts
SELECT COUNT(*) AS customers_count FROM customers;
SELECT COUNT(*) AS sales_count FROM sales;
SELECT COUNT(*) AS sale_items_count FROM sale_items;
SELECT COUNT(*) AS payments_count FROM payments;
SELECT COUNT(*) AS suppliers_count FROM suppliers;

DO $$
BEGIN
    RAISE NOTICE '✅ verify_migration.sql executed';
    RAISE NOTICE '✅ Migration complete. Verify counts against source data.';
END $$;

-- =============================================
-- MASTER MIGRATION COMPLETE
-- =============================================
