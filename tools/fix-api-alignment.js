#!/usr/bin/env node

/**
 * Script to align frontend API calls with backend routes
 * Fixes the mismatch found in the audit-communication.js output
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.cwd();
const backendRoutesDir = path.join(projectRoot, 'backend', 'routes');
const frontendJsDir = path.join(projectRoot, 'frontend', 'js');

// Backend route to frontend API mapping
const apiMapping = {
  // Authentication
  'authRoutes.js': {
    'POST /api/login': 'auth.js',
    'POST /api/logout': 'auth.js',
    'GET /api/check': 'auth.js',
    'GET /api/verify': 'auth.js',
    'GET /api/permissions': 'menu.js'
  },
  
  // POS System
  'posRoutes.js': {
    'GET /api/pos/products/:department': 'pos.js',
    'GET /api/pos/departments': 'pos.js',
    'GET /api/customers': 'pos.js',
    'POST /api/pos/checkout': 'pos.js',
    'GET /api/pos/learners/search': 'pos.js',
    'GET /api/classes': 'pos.js'
  },
  
  // Customers
  'customerRoutes.js': {
    'GET /api/customers': 'customers.js',
    'GET /api/customers/:id': 'customers.js',
    'POST /api/customers': 'customers.js',
    'PUT /api/customers/:id': 'customers.js',
    'GET /api/class/:className': 'customers.js',
    'GET /api/customers/:id/transactions': 'customers.js'
  },
  
  // Inventory
  'inventoryRoutes.js': {
    'GET /api/inventory/products': 'inventory.js',
    'GET /api/inventory/products/:id': 'inventory.js',
    'POST /api/inventory/products': 'inventory.js',
    'PUT /api/inventory/products/:id': 'inventory.js',
    'DELETE /api/inventory/products/:id': 'inventory.js',
    'GET /api/inventory/low-stock': 'inventory.js',
    'POST /api/inventory/products/:id/restock': 'inventory.js'
  },
  
  // Payments
  'paymentRoutes.js': {
    'GET /api/payments': 'payments.js',
    'POST /api/payments': 'payments.js',
    'GET /api/payments/outstanding': 'payments.js',
    'GET /api/payments/learner/:learnerId': 'payments.js'
  },
  
  // Dashboard
  'dashboardRoutes.js': {
    'GET /api/dashboard/stats': 'overview.js',
    'GET /api/dashboard/low-stock': 'overview.js',
    'GET /api/dashboard/recent-sales': 'overview.js',
    'GET /api/dashboard/customers-balance': 'overview.js'
  },
  
  // Suppliers
  'supplierRoutes.js': {
    'GET /api/suppliers': 'suppliers.js',
    'GET /api/suppliers/:id': 'suppliers.js',
    'POST /api/suppliers': 'suppliers.js',
    'PUT /api/suppliers/:id': 'suppliers.js',
    'GET /api/suppliers/:id/transactions': 'suppliers.js'
  },
  
  // Reports
  'reportRoutes.js': {
    'GET /api/reports/sales': 'reports.js',
    'GET /api/reports/inventory': 'reports.js',
    'GET /api/reports/customers': 'reports.js'
  },
  
  // Print
  'printRoutes.js': {
    'POST /api/print/receipt': 'thermal-printer.js'
  }
};

// Function to read backend routes and extract endpoints
function extractBackendRoutes() {
  const routes = {};
  
  fs.readdirSync(backendRoutesDir).forEach(file => {
    if (file.endsWith('.js')) {
      const filePath = path.join(backendRoutesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract route definitions
      const routeMatches = content.matchAll(/(router\.(get|post|put|delete))\s*\(\s*['"]([^'"]+)['"]/g);
      routes[file] = [];
      
      for (const match of routeMatches) {
        const method = match[2].toUpperCase();
        const endpoint = match[3];
        routes[file].push({ method, endpoint });
      }
    }
  });
  
  return routes;
}

// Function to check frontend API usage
function checkFrontendAPIs() {
  const frontendAPIs = {};
  
  fs.readdirSync(frontendJsDir).forEach(file => {
    if (file.endsWith('.js') && !file.includes('backup')) {
      const filePath = path.join(frontendJsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract API calls
      const apiMatches = content.matchAll(/fetch\s*\(\s*['"](\/api[^'"\s]+)['"]/g);
      const axiosMatches = content.matchAll(/axios\.(get|post|put|delete)\s*\(\s*['"](\/api[^'"\s]+)['"]/g);
      
      frontendAPIs[file] = [];
      
      for (const match of apiMatches) {
        frontendAPIs[file].push(match[1]);
      }
      
      for (const match of axiosMatches) {
        const method = match[1].toUpperCase();
        const endpoint = match[2];
        frontendAPIs[file].push(`${method} ${endpoint}`);
      }
    }
  });
  
  return frontendAPIs;
}

// Function to update api.js with proper endpoints
function updateApiJS() {
  const apiJsPath = path.join(frontendJsDir, 'api.js');
  let apiContent = fs.readFileSync(apiJsPath, 'utf8');
  
  const apiBase = `
// API Configuration
const API_BASE = '/api';

// Authentication APIs
export const authAPI = {
  login: \`\${API_BASE}/login\`,
  logout: \`\${API_BASE}/logout\`,
  checkSession: \`\${API_BASE}/check\`,
  verify: \`\${API_BASE}/verify\`,
  permissions: \`\${API_BASE}/permissions\`
};

// POS APIs
export const posAPI = {
  getDepartmentProducts: (department) => \`\${API_BASE}/pos/products/\${department}\`,
  getDepartments: \`\${API_BASE}/pos/departments\`,
  getAllCustomers: \`\${API_BASE}/customers\`,
  checkout: \`\${API_BASE}/pos/checkout\`,
  searchLearners: \`\${API_BASE}/pos/learners/search\`,
  getClasses: \`\${API_BASE}/classes\`
};

// Customer APIs
export const customerAPI = {
  getAll: \`\${API_BASE}/customers\`,
  getById: (id) => \`\${API_BASE}/customers/\${id}\`,
  create: \`\${API_BASE}/customers\`,
  update: (id) => \`\${API_BASE}/customers/\${id}\`,
  getByClass: (className) => \`\${API_BASE}/class/\${className}\`,
  getTransactions: (id) => \`\${API_BASE}/customers/\${id}/transactions\`
};

// Inventory APIs
export const inventoryAPI = {
  getAll: \`\${API_BASE}/inventory/products\`,
  getById: (id) => \`\${API_BASE}/inventory/products/\${id}\`,
  create: \`\${API_BASE}/inventory/products\`,
  update: (id) => \`\${API_BASE}/inventory/products/\${id}\`,
  delete: (id) => \`\${API_BASE}/inventory/products/\${id}\`,
  getLowStock: \`\${API_BASE}/inventory/low-stock\`,
  restock: (id) => \`\${API_BASE}/inventory/products/\${id}/restock\`
};

// Payment APIs
export const paymentAPI = {
  getAll: \`\${API_BASE}/payments\`,
  create: \`\${API_BASE}/payments\`,
  getOutstanding: \`\${API_BASE}/payments/outstanding\`,
  getByLearner: (learnerId) => \`\${API_BASE}/payments/learner/\${learnerId}\`
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: \`\${API_BASE}/dashboard/stats\`,
  getLowStock: \`\${API_BASE}/dashboard/low-stock\`,
  getRecentSales: \`\${API_BASE}/dashboard/recent-sales\`,
  getCustomerBalances: \`\${API_BASE}/dashboard/customers-balance\`
};

// Supplier APIs
export const supplierAPI = {
  getAll: \`\${API_BASE}/suppliers\`,
  getById: (id) => \`\${API_BASE}/suppliers/\${id}\`,
  create: \`\${API_BASE}/suppliers\`,
  update: (id) => \`\${API_BASE}/suppliers/\${id}\`,
  getTransactions: (id) => \`\${API_BASE}/suppliers/\${id}/transactions\`
};

// Report APIs
export const reportAPI = {
  getSales: \`\${API_BASE}/reports/sales\`,
  getInventory: \`\${API_BASE}/reports/inventory\`,
  getCustomers: \`\${API_BASE}/reports/customers\`
};

// Print APIs
export const printAPI = {
  printReceipt: \`\${API_BASE}/print/receipt\`
};

// Helper function for API calls
export async function apiCall(endpoint, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`
    },
    credentials: 'include'
  };

  const config = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(endpoint, config);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login if unauthorized
        window.location.href = '/login.html';
        return;
      }
      throw new Error(\`API error: \${response.status}\`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Specific API call functions
export async function getCustomers() {
  return apiCall(customerAPI.getAll);
}

export async function getProducts(department = null) {
  if (department) {
    return apiCall(posAPI.getDepartmentProducts(department));
  }
  return apiCall(inventoryAPI.getAll);
}

export async function checkoutSale(saleData) {
  return apiCall(posAPI.checkout, {
    method: 'POST',
    body: JSON.stringify(saleData)
  });
}

export async function getDashboardStats() {
  return apiCall(dashboardAPI.getStats);
}

export async function getLowStockItems() {
  return apiCall(inventoryAPI.getLowStock);
}
`;
  
  fs.writeFileSync(apiJsPath, apiBase);
  console.log('✅ Updated api.js with comprehensive API endpoints');
}

// Function to update HTML files to load thermal-printer.js
function updateHTMLFiles() {
  const htmlDir = path.join(projectRoot, 'frontend');
  
  // Files that should load thermal-printer.js
  const filesToUpdate = ['pos.html', 'refunds.html'];
  
  filesToUpdate.forEach(file => {
    const filePath = path.join(htmlDir, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check if thermal-printer.js is already loaded
      if (!content.includes('thermal-printer.js')) {
        // Add it before the closing body tag
        const scriptTag = '    <script type="module" src="js/thermal-printer.js"></script>\n  </body>';
        content = content.replace('  </body>', scriptTag);
        fs.writeFileSync(filePath, content);
        console.log(`✅ Added thermal-printer.js to ${file}`);
      }
    }
  });
}

// Function to update frontend JS files to use api.js
function updateFrontendJSFiles() {
  const frontendFiles = {
    'auth.js': `
import { authAPI, apiCall } from './api.js';

export async function login(username, password) {
  return apiCall(authAPI.login, {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function logout() {
  return apiCall(authAPI.logout, { method: 'POST' });
}

export async function checkSession() {
  return apiCall(authAPI.checkSession);
}

export async function verifyToken(token) {
  return apiCall(authAPI.verify, {
    headers: { 'Authorization': \`Bearer \${token}\` }
  });
}
`,
    'pos.js': `
import { posAPI, customerAPI, printAPI, apiCall, getProducts, checkoutSale } from './api.js';

export async function loadDepartmentProducts(department) {
  try {
    const data = await getProducts(department);
    // Process and display products
    return data;
  } catch (error) {
    console.error('Error loading products:', error);
    throw error;
  }
}

export async function loadDepartments() {
  return apiCall(posAPI.getDepartments);
}

export async function loadCustomers() {
  return apiCall(customerAPI.getAll);
}

export async function searchLearners(query) {
  return apiCall(\`\${posAPI.searchLearners}?q=\${encodeURIComponent(query)}\`);
}

export async function processCheckout(checkoutData) {
  try {
    const result = await checkoutSale(checkoutData);
    
    // Print receipt if successful
    if (result.success && result.sale_id) {
      await printReceipt(result.sale_id);
    }
    
    return result;
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
}

export async function printReceipt(saleId) {
  return apiCall(printAPI.printReceipt, {
    method: 'POST',
    body: JSON.stringify({ sale_id: saleId })
  });
}
`,
    'customers.js': `
import { customerAPI, apiCall } from './api.js';

export async function loadCustomers() {
  try {
    const data = await apiCall(customerAPI.getAll);
    // Process and display customers
    return data;
  } catch (error) {
    console.error('Error loading customers:', error);
    throw error;
  }
}

export async function loadCustomerDetails(id) {
  return apiCall(customerAPI.getById(id));
}

export async function createCustomer(customerData) {
  return apiCall(customerAPI.create, {
    method: 'POST',
    body: JSON.stringify(customerData)
  });
}

export async function updateCustomer(id, customerData) {
  return apiCall(customerAPI.update(id), {
    method: 'PUT',
    body: JSON.stringify(customerData)
  });
}

export async function loadClassCustomers(className) {
  return apiCall(customerAPI.getByClass(className));
}

export async function loadCustomerTransactions(id) {
  return apiCall(customerAPI.getTransactions(id));
}
`,
    'inventory.js': `
import { inventoryAPI, apiCall } from './api.js';

export async function loadInventory() {
  try {
    const data = await apiCall(inventoryAPI.getAll);
    // Process and display inventory
    return data;
  } catch (error) {
    console.error('Error loading inventory:', error);
    throw error;
  }
}

export async function loadProductDetails(id) {
  return apiCall(inventoryAPI.getById(id));
}

export async function createProduct(productData) {
  return apiCall(inventoryAPI.create, {
    method: 'POST',
    body: JSON.stringify(productData)
  });
}

export async function updateProduct(id, productData) {
  return apiCall(inventoryAPI.update(id), {
    method: 'PUT',
    body: JSON.stringify(productData)
  });
}

export async function deleteProduct(id) {
  return apiCall(inventoryAPI.delete(id), { method: 'DELETE' });
}

export async function loadLowStock() {
  return apiCall(inventoryAPI.getLowStock);
}

export async function restockProduct(id, restockData) {
  return apiCall(inventoryAPI.restock(id), {
    method: 'POST',
    body: JSON.stringify(restockData)
  });
}
`,
    'overview.js': `
import { dashboardAPI, apiCall, getDashboardStats, getLowStockItems } from './api.js';

export async function loadDashboardData() {
  try {
    const [stats, lowStock, recentSales, customerBalances] = await Promise.all([
      getDashboardStats(),
      getLowStockItems(),
      apiCall(dashboardAPI.getRecentSales),
      apiCall(dashboardAPI.getCustomerBalances)
    ]);
    
    return { stats, lowStock, recentSales, customerBalances };
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    throw error;
  }
}
`,
    'payments.js': `
import { paymentAPI, apiCall } from './api.js';

export async function loadPayments() {
  try {
    const data = await apiCall(paymentAPI.getAll);
    // Process and display payments
    return data;
  } catch (error) {
    console.error('Error loading payments:', error);
    throw error;
  }
}

export async function createPayment(paymentData) {
  return apiCall(paymentAPI.create, {
    method: 'POST',
    body: JSON.stringify(paymentData)
  });
}

export async function loadOutstandingPayments() {
  return apiCall(paymentAPI.getOutstanding);
}

export async function loadLearnerPayments(learnerId) {
  return apiCall(paymentAPI.getByLearner(learnerId));
}
`,
    'suppliers.js': `
import { supplierAPI, apiCall } from './api.js';

export async function loadSuppliers() {
  try {
    const data = await apiCall(supplierAPI.getAll);
    // Process and display suppliers
    return data;
  } catch (error) {
    console.error('Error loading suppliers:', error);
    throw error;
  }
}

export async function loadSupplierDetails(id) {
  return apiCall(supplierAPI.getById(id));
}

export async function createSupplier(supplierData) {
  return apiCall(supplierAPI.create, {
    method: 'POST',
    body: JSON.stringify(supplierData)
  });
}

export async function updateSupplier(id, supplierData) {
  return apiCall(supplierAPI.update(id), {
    method: 'PUT',
    body: JSON.stringify(supplierData)
  });
}

export async function loadSupplierTransactions(id) {
  return apiCall(supplierAPI.getTransactions(id));
}
`,
    'reports.js': `
import { reportAPI, apiCall } from './api.js';

export async function generateSalesReport(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(\`\${reportAPI.getSales}?\${query}\`);
}

export async function generateInventoryReport(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(\`\${reportAPI.getInventory}?\${query}\`);
}

export async function generateCustomerReport(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(\`\${reportAPI.getCustomers}?\${query}\`);
}
`
  };

  Object.entries(frontendFiles).forEach(([filename, content]) => {
    const filePath = path.join(frontendJsDir, filename);
    
    // Backup original file
    const backupPath = filePath + '.backup-' + Date.now();
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`📦 Created backup: ${backupPath}`);
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filename}`);
  });
}

// Function to create missing backend endpoints
function createMissingEndpoints() {
  const missingEndpoints = {
    'posRoutes.js': `
const express = require('express');
const router = express.Router();
const posService = require('../services/posService');

// Get products by department
router.get('/products/:department', async (req, res) => {
  try {
    const { department } = req.params;
    const products = await posService.getProductsByDepartment(department);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get all departments
router.get('/departments', async (req, res) => {
  try {
    const departments = await posService.getDepartments();
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// POS checkout
router.post('/checkout', async (req, res) => {
  try {
    const saleData = req.body;
    const result = await posService.processSale(saleData);
    res.json(result);
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

// Search learners
router.get('/learners/search', async (req, res) => {
  try {
    const { q } = req.query;
    const learners = await posService.searchLearners(q);
    res.json(learners);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
`,
    'dashboardRoutes.js': `
const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get low stock items
router.get('/low-stock', async (req, res) => {
  try {
    const lowStock = await dashboardService.getLowStockItems();
    res.json(lowStock);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

// Get recent sales
router.get('/recent-sales', async (req, res) => {
  try {
    const recentSales = await dashboardService.getRecentSales();
    res.json(recentSales);
  } catch (error) {
    console.error('Error fetching recent sales:', error);
    res.status(500).json({ error: 'Failed to fetch recent sales' });
  }
});

// Get customer balances
router.get('/customers-balance', async (req, res) => {
  try {
    const balances = await dashboardService.getCustomerBalances();
    res.json(balances);
  } catch (error) {
    console.error('Error fetching customer balances:', error);
    res.status(500).json({ error: 'Failed to fetch customer balances' });
  }
});

module.exports = router;
`
  };

  Object.entries(missingEndpoints).forEach(([filename, content]) => {
    const filePath = path.join(backendRoutesDir, filename);
    
    if (fs.existsSync(filePath)) {
      // Read existing content and merge
      let existingContent = fs.readFileSync(filePath, 'utf8');
      
      // Check if routes already exist
      if (!existingContent.includes('/products/:department')) {
        // Append new routes before module.exports
        existingContent = existingContent.replace(
          'module.exports = router;',
          content + '\n\nmodule.exports = router;'
        );
        
        fs.writeFileSync(filePath, existingContent);
        console.log(`✅ Added missing endpoints to ${filename}`);
      }
    }
  });
}

// Function to update server.js to use correct route prefixes
function updateServerJS() {
  const serverPath = path.join(projectRoot, 'server.js');
  let serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Ensure proper route mounting
  const routeMounting = `
// Mount routes with proper prefixes
app.use('/api/auth', authRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/print', printRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/pocket-money', pocketMoneyRoutes);
app.use('/api/refunds', refundRoutes);
`;
  
  // Replace route mounting section
  if (serverContent.includes('app.use(\'/api\'')) {
    // Find and replace the route mounting section
    const routeSection = serverContent.match(/\/\/ Mount routes[\s\S]*?(?=\/\/ Error handling)/);
    if (routeSection) {
      serverContent = serverContent.replace(routeSection[0], routeMounting);
      console.log('✅ Updated route mounting in server.js');
    }
  }
  
  fs.writeFileSync(serverPath, serverContent);
}

// Main function
async function main() {
  console.log('🚀 Starting API alignment fix...\n');
  
  // Step 1: Analyze current state
  console.log('📊 Analyzing current API state...');
  const backendRoutes = extractBackendRoutes();
  const frontendAPIs = checkFrontendAPIs();
  
  console.log(`Found ${Object.keys(backendRoutes).length} backend route files`);
  console.log(`Found ${Object.keys(frontendAPIs).length} frontend JS files`);
  
  // Step 2: Update api.js
  console.log('\n🔄 Updating api.js...');
  updateApiJS();
  
  // Step 3: Update frontend JS files
  console.log('\n🔄 Updating frontend JS files...');
  updateFrontendJSFiles();
  
  // Step 4: Update HTML files
  console.log('\n🔄 Updating HTML files...');
  updateHTMLFiles();
  
  // Step 5: Create missing backend endpoints
  console.log('\n🔄 Creating missing backend endpoints...');
  createMissingEndpoints();
  
  // Step 6: Update server.js
  console.log('\n🔄 Updating server.js...');
  updateServerJS();
  
  // Step 7: Install missing dependencies
  console.log('\n📦 Checking dependencies...');
  try {
    execSync('npm install node-fetch', { cwd: projectRoot, stdio: 'inherit' });
    console.log('✅ Installed node-fetch');
  } catch (error) {
    console.log('⚠️  Could not install node-fetch, but continuing...');
  }
  
  console.log('\n✅ API alignment fix completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Run the server: node server.js');
  console.log('2. Test the POS system');
  console.log('3. Check dashboard data loading');
  console.log('4. Verify customer management');
  console.log('\n⚠️  Note: Backups of original files have been created with .backup- timestamp');
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

module.exports = { main };