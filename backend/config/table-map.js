// backend/config/table-map.js
module.exports = {
  // Core POS tables
  products: 'products',
  customers: 'customers',
  sales: 'sales',
  sale_items: 'sale_items',
  payments: 'payments',
  
  // Additional tables
  allocations: 'allocations',
  allocation_history: 'allocation_history', // Added to fix 500 error
  installment_payments: 'installment_payments', // Added to fix 500 error
  refunds: 'refunds',
  suppliers: 'suppliers',
  restocks: 'restocks',
  
  // Batch & Programs
  batches: 'batches',
  batch_items: 'batch_items',
  program_definitions: 'program_definitions',
  promotion_history: 'promotion_history',
  
  // Financials
  debts: 'debts',
  disbursements: 'disbursements',
  invoices: 'invoices',
  invoice_items: 'invoice_items',
  supplier_credits: 'supplier_credits',
  supplier_payments: 'supplier_payments',
  
  // User management
  users: 'users',
  sessions: 'user_sessions', // Corrected to match your DB 'user_sessions'
  
  // Legacy/compatibility keys
  product: 'products',
  customer: 'customers',
  learner: 'customers',
  sale: 'sales',
  stock: 'products',
  supplier: 'suppliers'
};
