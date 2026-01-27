-- schema.sql
-- SteadyMonitor PostgreSQL Schema - Generated from CSV analysis

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== CUSTOMERS TABLE ==========
CREATE TABLE customers (
  customers_id SERIAL PRIMARY KEY,
  customer_id VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  class VARCHAR(100) NOT NULL,
  boarding_status VARCHAR(100) NOT NULL,
  program_membership VARCHAR(100) NOT NULL,
  allocation_program VARCHAR(100) NOT NULL,
  exercise_book_program VARCHAR(100) NOT NULL,
  pocket_money_program VARCHAR(100),
  allocation_frequency_metadata VARCHAR(100),
  balance INTEGER NOT NULL,
  contact VARCHAR(50),
  email VARCHAR(100),
  parent_name VARCHAR(100) NOT NULL,
  parent_phone VARCHAR(50) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  installment_status VARCHAR(100) NOT NULL,
  notes VARCHAR(100),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  pocket_money_enabled VARCHAR(100),
  total_items_cost INTEGER,
  amount_paid INTEGER,
  guardian_address VARCHAR(100),
  guardian_email VARCHAR(100),
  payment_duration_months INTEGER,
  last_payment_date VARCHAR(100),
  next_payment_due VARCHAR(100),
  disbursement_notes VARCHAR(100),
  class_teacher VARCHAR(100)
);

-- ========== PAYMENTS TABLE ==========
CREATE TABLE payments (
  payments_id SERIAL PRIMARY KEY,
  payment_id VARCHAR(100) NOT NULL,
  sale_id VARCHAR(100) NOT NULL,
  customer_id VARCHAR(100) NOT NULL,
  method VARCHAR(100) NOT NULL,
  reference VARCHAR(100) NOT NULL,
  amount INTEGER NOT NULL,
  date TIMESTAMP NOT NULL,
  is_installment VARCHAR(100) NOT NULL,
  status VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- ========== PRODUCTS TABLE ==========
CREATE TABLE products (
  products_id SERIAL PRIMARY KEY,
  product_id VARCHAR(100) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  department VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  buy_price DECIMAL(12, 2) NOT NULL,
  sell_price DECIMAL(12, 2) NOT NULL,
  stock_qty INTEGER NOT NULL,
  reorder_level INTEGER NOT NULL,
  supplier_id VARCHAR(100),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  active VARCHAR(100) NOT NULL
);

-- ========== SALES TABLE ==========
CREATE TABLE sales (
  sales_id SERIAL PRIMARY KEY,
  sale_id VARCHAR(100) NOT NULL,
  date TIMESTAMP NOT NULL,
  department VARCHAR(100) NOT NULL,
  served_by VARCHAR(100) NOT NULL,
  customer_id VARCHAR(100) NOT NULL,
  customer_type VARCHAR(100) NOT NULL,
  payment_mode VARCHAR(100) NOT NULL,
  total DECIMAL(12, 2) NOT NULL,
  paid DECIMAL(12, 2) NOT NULL,
  balance DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(12, 2) NOT NULL,
  discount_reason VARCHAR(100),
  reference_id VARCHAR(100) NOT NULL,
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- ========== SALE_ITEMS TABLE ==========
CREATE TABLE sale_items (
  sale_items_id SERIAL PRIMARY KEY,
  sale_item_id VARCHAR(100) NOT NULL,
  sale_id VARCHAR(100) NOT NULL,
  product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  qty INTEGER NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  cost_price DECIMAL(12, 2) NOT NULL,
  department VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  sku VARCHAR(100)
);

-- ========== SUPPLIERS TABLE ==========
CREATE TABLE suppliers (
  suppliers_id SERIAL PRIMARY KEY,
  supplier_id VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  balance DECIMAL(12, 2) NOT NULL,
  active VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  contact VARCHAR(100),
  email VARCHAR(100),
  products_supplied TEXT
);

-- ========== CREATE INDEXES ==========
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_department ON products(department);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_payments_sale ON payments(sale_id);