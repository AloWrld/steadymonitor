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
  pocket_money: 'pocket_money',
  pocket_money_balance: 'pocket_money_balance',
  refunds: 'refunds',
  suppliers: 'suppliers',
  restocks: 'restocks',
  sale_items: 'sale_items',
  
  // User management
  users: 'users',
  sessions: 'sessions',
  
  // Legacy/compatibility keys
  product: 'products',      // For backward compatibility
  customer: 'customers',    // For backward compatibility
  learner: 'customers',     // For backward compatibility
  sale: 'sales',           // For backward compatibility
  stock: 'products',       // For backward compatibility
  pocket: 'pocket_money',  // For backward compatibility
  balance: 'pocket_money_balance',  // For backward compatibility
  supplier: 'suppliers'    // For backward compatibility
};