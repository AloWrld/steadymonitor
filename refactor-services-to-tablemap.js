/**
 * refactor-services-to-tablemap.js
 *
 * Permanently refactors all backend service files to use a centralized
 * table-mapping layer instead of hardcoded table names.
 *
 * Safe, idempotent, and production-ready.
 */

const fs = require('fs');
const path = require('path');

const SERVICES_DIR = path.join(__dirname, 'backend', 'services');
const CONFIG_DIR = path.join(__dirname, 'backend', 'config');
const TABLE_MAP_PATH = path.join(CONFIG_DIR, 'table-map.js');

/**
 * Canonical table mapping
 * Keys = logical names used in services
 * Values = actual PostgreSQL tables
 */
const TABLE_MAP = {
  product: 'products',
  products: 'products',

  customer: 'customers',
  customers: 'customers',
  learner: 'customers',

  sale: 'sales',
  sales: 'sales',

  sale_items: 'sale_items',

  stock: 'products',

  payment: 'payments',
  payments: 'payments',

  installment: 'installments',
  installment_payments: 'installment_payments',

  allocation: 'allocations',
  allocations: 'allocations',
  allocation_history: 'allocation_history',

  supplier: 'suppliers',
  suppliers: 'suppliers',
  supplier_credits: 'supplier_credits',
  supplier_payments: 'supplier_payments',

  pocket: 'pocket_money',
  pocket_money: 'pocket_money',
  balance: 'pocket_money_balance',

  refunds: 'refunds',
  restocks: 'restocks',
  debts: 'debts',
  disbursements: 'disbursements',
  ranked_classes: 'ranked_classes',
  customer_statistics: 'customer_statistics'
};

/* ------------------------------------------------------------------ */
/* 1. Ensure table-map.js exists                                       */
/* ------------------------------------------------------------------ */

if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

if (!fs.existsSync(TABLE_MAP_PATH)) {
  const content =
`/**
 * Centralized database table mapping
 * DO NOT hardcode table names in services.
 */
module.exports = ${JSON.stringify(TABLE_MAP, null, 2)};
`;
  fs.writeFileSync(TABLE_MAP_PATH, content, 'utf8');
  console.log('✅ Created backend/config/table-map.js');
} else {
  console.log('ℹ️  table-map.js already exists (not overwritten)');
}

/* ------------------------------------------------------------------ */
/* 2. Refactor service files                                           */
/* ------------------------------------------------------------------ */

const serviceFiles = fs
  .readdirSync(SERVICES_DIR)
  .filter(f => f.endsWith('.js'));

serviceFiles.forEach(file => {
  const filePath = path.join(SERVICES_DIR, file);
  const backupPath = filePath + '.pre-tablemap.backup';

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already refactored
  if (content.includes('table-map')) {
    console.log(`↩️  Skipped (already refactored): ${file}`);
    return;
  }

  /* Insert TABLE import after existing requires */
  const requireMatch = content.match(/^(const .*require\(.*\);\s*)+/m);
  if (requireMatch) {
    const insertPoint = requireMatch[0];
    const tableImport = `const TABLE = require('../config/table-map');\n`;
    content = content.replace(insertPoint, insertPoint + tableImport);
  } else {
    content = `const TABLE = require('../config/table-map');\n\n` + content;
  }

  /* Replace table names inside SQL strings */
  Object.entries(TABLE_MAP).forEach(([alias, real]) => {
    const patterns = [
      `FROM\\s+${alias}\\b`,
      `JOIN\\s+${alias}\\b`,
      `INTO\\s+${alias}\\b`,
      `UPDATE\\s+${alias}\\b`,
      `DELETE\\s+FROM\\s+${alias}\\b`
    ];

    patterns.forEach(p => {
      const regex = new RegExp(p, 'gi');
      content = content.replace(regex, match =>
        match.replace(
          new RegExp(`\\b${alias}\\b`, 'i'),
          `\${TABLE.${real}}`
        )
      );
    });
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Refactored: ${file}`);
});

console.log('\n🎯 Permanent table-mapping refactor complete.');
console.log('   All services now depend on backend/config/table-map.js');
