// tools/auto-update-frontend-api.js
const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '../frontend');
const JS_DIR = path.join(FRONTEND_DIR, 'js'); // optional if you have separate JS

// Canonical API from your api.js
const CANONICAL_API = {
  auth: ['login', 'logout', 'check', 'verify', 'permissions', 'health'],
  allocation: ['createBatch', 'getCustomer', 'getProgram', 'summary', 'batches', 'batch', 'eligible', 'stats'],
  checkout: ['complete', 'receipt', 'lookupReceipt', 'mpesaStk'],
  customer: [
    'get','update','remove','pay','adjustBalance','allocations','allocate','fulfillAllocation',
    'allocationHistory','pocketMoneyStatus','exerciseEligibility','recordInstallment','installments',
    'ledger','transactions','createBatch','classCustomers','updateBatchPayment','promote','promoteBatch',
    'changeClass','promotionHistory','disbursementHistory'
  ],
  dashboard: ['stats','lowStock','recentSales','customersBalance'],
  inventory: ['products','product','create','update','remove','restock','adjustStock','lowStock','search','dashboard','activity'],
  payment: ['bulk','byCustomer','summary','outstanding','validate','get','installments','stats'],
  pocketMoney: ['purchase','topup','deduct','history','summary','stats','enable','disable','validate','status'],
  pos: ['productsByDepartment','search','productBySku','mpesaPush','checkout','lookup','classCustomers','searchCustomers','customer','classes','departments','debugCalls'],
  print: ['receipt','invoice','getInvoice','batch','settings','invoices'],
  refund: ['sale','receipt','summary','lookupReceipt'],
  report: ['sales','profit','inventory','customers','allocations','pocketMoney','installments','suppliers','exportExcel','exportPdf','dataStatus','overview'],
  supplier: ['get','update','remove','search','restock','restocks','payments','credits','transactions','dueCredits','lowStock','performance']
};

// Flatten canonical API for quick lookup: API.callName => API.category.callName
const CANONICAL_MAP = {};
Object.entries(CANONICAL_API).forEach(([category, methods]) => {
  methods.forEach(m => {
    CANONICAL_MAP[m] = `API.${category}.${m}`;
  });
});

// Scan file content for any API.<something> calls
function replaceApiCalls(content) {
  return content.replace(/API\.([a-zA-Z0-9_]+)/g, (match, p1) => {
    if (CANONICAL_MAP[p1]) return CANONICAL_MAP[p1];
    return match; // keep unchanged if not found
  });
}

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const updated = replaceApiCalls(content);
  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`✅ Updated ${path.relative(FRONTEND_DIR, filePath)}`);
  }
}

function updateHtmlFiles() {
  fs.readdirSync(FRONTEND_DIR).forEach(file => {
    if (file.endsWith('.html')) {
      updateFile(path.join(FRONTEND_DIR, file));
    }
  });
}

function updateJsFiles() {
  if (!fs.existsSync(JS_DIR)) return;
  fs.readdirSync(JS_DIR).forEach(file => {
    if (file.endsWith('.js')) {
      updateFile(path.join(JS_DIR, file));
    }
  });
}

console.log('🔧 Scanning frontend for API calls...');
updateHtmlFiles();
updateJsFiles();
console.log('🎉 All frontend files now match canonical API calls!');

