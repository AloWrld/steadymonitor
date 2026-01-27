#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const backendRoutesDir = path.join(projectRoot, 'backend', 'routes');

console.log('🔍 Checking how routes import services...\n');

const routeFiles = fs.readdirSync(backendRoutesDir).filter(f => f.endsWith('.js'));

routeFiles.forEach(file => {
    const filePath = path.join(backendRoutesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`📄 ${file}:`);
    
    // Find service imports
    const serviceImports = content.match(/require\s*\(\s*['"](\.\.\/services\/[^'"]+)['"]/g) || [];
    
    if (serviceImports.length > 0) {
        serviceImports.forEach(imp => {
            console.log(`  📦 ${imp}`);
            
            // Extract service name
            const match = imp.match(/['"]([^'"]+)['"]/);
            if (match) {
                const servicePath = match[1];
                const fullPath = path.join(backendRoutesDir, servicePath);
                
                try {
                    require.resolve(fullPath);
                    console.log(`    ✅ Service exists`);
                } catch (e) {
                    console.log(`    ❌ Service NOT FOUND at: ${fullPath}`);
                }
            }
        });
    } else {
        console.log(`  ⚠️  No service imports found`);
    }
    
    console.log('-'.repeat(60));
});