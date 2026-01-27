#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const serverPath = path.join(projectRoot, 'server.js');

console.log('🔍 Checking server.js route mounting...\n');

if (!fs.existsSync(serverPath)) {
  console.log('❌ server.js not found');
  process.exit(1);
}

const content = fs.readFileSync(serverPath, 'utf8');
const lines = content.split('\n');

console.log('Current route imports and mounting:');
console.log('='.repeat(80));

// Find route imports
let foundImports = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('require') && line.includes('routes/')) {
    console.log(`${i + 1}: ${line.trim()}`);
    foundImports = true;
  }
}

if (!foundImports) {
  console.log('No route imports found!');
}

console.log('\nRoute mounting:');
console.log('-'.repeat(80));

let inMountSection = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  if (line.includes('app.use') && (line.includes('/api') || line.includes('routes'))) {
    console.log(`${i + 1}: ${line}`);
    inMountSection = true;
  } else if (inMountSection && line && !line.includes('app.use') && 
             !line.startsWith('//') && !line.startsWith('/*')) {
    inMountSection = false;
  }
}

console.log('='.repeat(80));

// Let's also check if routes are mounted with correct prefixes
console.log('\n📊 Route prefix analysis:');
const mountedRoutes = {};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('app.use')) {
    // Extract the route prefix and variable name
    const match = line.match(/app\.use\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\w+Routes?)\s*\)/);
    if (match) {
      const prefix = match[1];
      const routeName = match[2];
      mountedRoutes[routeName] = prefix;
    }
  }
}

// Expected routes from your directory
const expectedRoutes = [
  'allocationRoutes', 'authRoutes', 'checkoutRoutes', 'customerRoutes',
  'dashboardRoutes', 'inventoryRoutes', 'paymentRoutes', 'pocketMoneyRoutes',
  'posRoutes', 'printRoutes', 'refundRoutes', 'reportRoutes', 'supplierRoutes'
];

console.log('\nExpected vs Actual mounting:');
expectedRoutes.forEach(route => {
  if (mountedRoutes[route]) {
    console.log(`✅ ${route}: mounted at ${mountedRoutes[route]}`);
  } else {
    console.log(`❌ ${route}: NOT mounted`);
  }
});