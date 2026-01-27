#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = process.cwd();
const backendRoutesDir = path.join(projectRoot, 'backend', 'routes');

console.log('🔍 Checking syntax of all route files...\n');

const routeFiles = fs.readdirSync(backendRoutesDir).filter(f => f.endsWith('.js'));
let hasErrors = false;

routeFiles.forEach(file => {
    const filePath = path.join(backendRoutesDir, file);
    
    console.log(`📄 ${file}:`);
    
    // Use Node.js to check syntax
    const result = spawnSync('node', ['-c', filePath], { encoding: 'utf8' });
    
    if (result.status === 0) {
        console.log('  ✅ Syntax OK');
    } else {
        console.log('  ❌ Syntax error!');
        console.log('  ' + result.stderr.split('\n').slice(0, 3).join('\n  '));
        hasErrors = true;
    }
    
    console.log('-'.repeat(50));
});

if (hasErrors) {
    console.log('\n❌ Some files have syntax errors. Need to fix them.');
    console.log('\n💡 Try: node tools/fix-dashboard-syntax.js (already did this)');
    console.log('💡 Or manually check the problematic files.');
} else {
    console.log('\n✅ All route files have valid syntax!');
    console.log('\nNow try: node server.js');
}