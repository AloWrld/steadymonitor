#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const backendRoutesDir = path.join(projectRoot, 'backend', 'routes');

console.log('🔍 Diagnosing route files...\n');

// List all route files
const routeFiles = fs.readdirSync(backendRoutesDir).filter(f => f.endsWith('.js'));
console.log(`Found ${routeFiles.length} route files:`);

routeFiles.forEach(file => {
  const filePath = path.join(backendRoutesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n📄 ${file}:`);
  console.log('-'.repeat(80));
  
  // Check for duplicate declarations
  const expressCount = (content.match(/const express = require/g) || []).length;
  const routerCount = (content.match(/const router = express\.Router/g) || []).length;
  
  if (expressCount > 1) console.log(`⚠️  Found ${expressCount} express declarations`);
  if (routerCount > 1) console.log(`⚠️  Found ${routerCount} router declarations`);
  
  // Extract route definitions
  const routes = [];
  const routeRegex = /router\.(get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push(`${match[1].toUpperCase()} ${match[2]}`);
  }
  
  console.log(`Routes (${routes.length}):`);
  routes.forEach(route => console.log(`  ${route}`));
  
  // Check for module.exports
  if (!content.includes('module.exports = router')) {
    console.log('❌ Missing module.exports');
  }
  
  console.log('-'.repeat(80));
});