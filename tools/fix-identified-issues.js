#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const backendRoutesDir = path.join(projectRoot, 'backend', 'routes');

console.log('🔧 Fixing identified issues...\n');

// Fix 1: dashboardRoutes.js - remove duplicate routes
function fixDashboardRoutes() {
  const filePath = path.join(backendRoutesDir, 'dashboardRoutes.js');
  const backupPath = filePath + '.backup-' + Date.now();
  
  let content = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(backupPath, content);
  console.log(`📦 Backed up dashboardRoutes.js to ${backupPath}`);
  
  // Split into lines and remove duplicates
  const lines = content.split('\n');
  const uniqueRoutes = [];
  const seenRoutes = new Set();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this line contains a route definition
    if (line.includes('router.get') || line.includes('router.post') || 
        line.includes('router.put') || line.includes('router.delete')) {
      
      // Extract the route path
      const routeMatch = line.match(/router\.\w+\s*\(\s*['"]([^'"]+)['"]/);
      if (routeMatch) {
        const routePath = routeMatch[1];
        if (seenRoutes.has(routePath)) {
          console.log(`➖ Removing duplicate route: ${routePath}`);
          // Also remove the handler function that follows
          let j = i + 1;
          while (j < lines.length && !lines[j].trim().includes('router.') && 
                 !lines[j].trim().includes('module.exports')) {
            j++;
          }
          i = j - 1; // Skip to after the handler
          continue;
        }
        seenRoutes.add(routePath);
      }
    }
    
    uniqueRoutes.push(lines[i]);
  }
  
  // Write back
  fs.writeFileSync(filePath, uniqueRoutes.join('\n'));
  console.log('✅ Fixed dashboardRoutes.js - removed duplicate routes');
}

// Fix 2: authRoutes.js - add missing module.exports
function fixAuthRoutes() {
  const filePath = path.join(backendRoutesDir, 'authRoutes.js');
  const backupPath = filePath + '.backup-' + Date.now();
  
  let content = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(backupPath, content);
  console.log(`📦 Backed up authRoutes.js to ${backupPath}`);
  
  // Check if module.exports exists
  if (!content.includes('module.exports = router')) {
    // Add it at the end
    content = content.trim();
    if (!content.endsWith(';')) {
      content += ';';
    }
    content += '\n\nmodule.exports = router;\n';
    
    fs.writeFileSync(filePath, content);
    console.log('✅ Fixed authRoutes.js - added module.exports');
  } else {
    console.log('✅ authRoutes.js already has module.exports');
  }
}

// Fix 3: Check and fix all route files for common issues
function checkAllRouteFiles() {
  const routeFiles = fs.readdirSync(backendRoutesDir).filter(f => f.endsWith('.js'));
  
  console.log('\n🔍 Checking all route files for issues:');
  console.log('-'.repeat(50));
  
  routeFiles.forEach(file => {
    const filePath = path.join(backendRoutesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`\n📄 ${file}:`);
    
    // Check 1: Has express import
    if (!content.includes('const express = require')) {
      console.log('  ⚠️  Missing express import');
    }
    
    // Check 2: Has router creation
    if (!content.includes('const router = express.Router')) {
      console.log('  ⚠️  Missing router creation');
    }
    
    // Check 3: Has module.exports
    if (!content.includes('module.exports = router')) {
      console.log('  ❌ Missing module.exports');
    }
    
    // Check 4: Count routes
    const routeCount = (content.match(/router\.(get|post|put|delete)/g) || []).length;
    console.log(`  📊 ${routeCount} routes defined`);
    
    // Check for syntax errors (simple check)
    const lines = content.split('\n');
    let hasSyntaxError = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('const ') && lines[i].includes('=') && 
          !lines[i].trim().endsWith(';') && !lines[i+1]?.trim().startsWith('const')) {
        // Check if next line is also not a const declaration
        if (lines[i+1] && !lines[i+1].trim().startsWith('const')) {
          console.log(`  ⚠️  Possible missing semicolon at line ${i+1}`);
          hasSyntaxError = true;
        }
      }
    }
  });
  
  console.log('-'.repeat(50));
}

// Fix 4: Create a clean, minimal api.js for frontend
function createMinimalAPI() {
  const frontendJsDir = path.join(projectRoot, 'frontend', 'js');
  const apiJsPath = path.join(frontendJsDir, 'api.js');
  
  const minimalAPI = `// Minimal API helper for SteadyMonitor
// Use this for all API calls

const API_BASE = 'http://localhost:3001';

async function apiCall(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? \`\${API_BASE}\${endpoint}\` : endpoint;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    mode: 'cors'
  };

  const config = { ...defaultOptions, ...options };
  
  try {
    console.log('[API] Calling:', url);
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Error:', response.status, errorText);
      
      if (response.status === 401) {
        window.location.href = '/login.html';
        return null;
      }
      
      throw new Error(\`API Error \${response.status}: \${errorText.substring(0, 100)}\`);
    }
    
    const data = await response.json();
    console.log('[API] Success:', data);
    return data;
  } catch (error) {
    console.error('[API] Fetch failed:', error);
    throw error;
  }
}

// Export common API calls
export async function getCustomers() {
  return apiCall('/api/customers');
}

export async function getProducts() {
  return apiCall('/api/inventory/products');
}

export async function getDashboardStats() {
  return apiCall('/api/dashboard/stats');
}

export async function getLowStock() {
  return apiCall('/api/inventory/low-stock');
}

export async function getDepartments() {
  return apiCall('/api/pos/departments');
}

export async function getClasses() {
  return apiCall('/api/pos/classes');
}

export async function searchLearners(query) {
  return apiCall(\`/api/pos/learners/search?q=\${encodeURIComponent(query)}\`);
}

export async function login(username, password) {
  return apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function logout() {
  return apiCall('/api/auth/logout', { method: 'POST' });
}

export async function checkout(saleData) {
  return apiCall('/api/pos/checkout', {
    method: 'POST',
    body: JSON.stringify(saleData)
  });
}

export async function createCustomer(customerData) {
  return apiCall('/api/customers', {
    method: 'POST',
    body: JSON.stringify(customerData)
  });
}

// Test function
export async function testAPI() {
  console.log('Testing API connectivity...');
  
  const endpoints = [
    '/api/auth/check',
    '/api/customers',
    '/api/inventory/products',
    '/api/dashboard/stats',
    '/api/pos/departments'
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      const data = await apiCall(endpoint);
      results[endpoint] = { success: true, data: data ? 'OK' : 'No data' };
    } catch (error) {
      results[endpoint] = { success: false, error: error.message };
    }
  }
  
  return results;
}

// Make apiCall available for custom calls
export { apiCall };
`;
  
  // Backup existing
  if (fs.existsSync(apiJsPath)) {
    const backup = apiJsPath + '.backup-' + Date.now();
    fs.copyFileSync(apiJsPath, backup);
    console.log(`\n📦 Backed up existing api.js to ${backup}`);
  }
  
  fs.writeFileSync(apiJsPath, minimalAPI);
  console.log('✅ Created minimal api.js');
}

// Main execution
function main() {
  console.log('🚀 Starting fixes...\n');
  
  // Run fixes
  fixDashboardRoutes();
  fixAuthRoutes();
  checkAllRouteFiles();
  createMinimalAPI();
  
  console.log('\n🎉 All fixes completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Start the server: node server.js');
  console.log('2. If there are still errors, check the console output');
  console.log('3. Test basic functionality');
}

// Run it
main();