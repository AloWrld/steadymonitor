#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const authRoutesPath = path.join(projectRoot, 'backend', 'routes', 'authRoutes.js');

console.log('🔧 Fixing authRoutes.js...\n');

let content = fs.readFileSync(authRoutesPath, 'utf8');

// Backup
const backupPath = authRoutesPath + '.backup-' + Date.now();
fs.writeFileSync(backupPath, content);
console.log(`📦 Created backup: ${backupPath}`);

// Remove the duplicate module.exports
const lines = content.split('\n');
let inFunctionExport = false;
let functionEndLine = -1;
let duplicateExportLine = -1;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('module.exports = function(db)')) {
        inFunctionExport = true;
    }
    
    if (inFunctionExport && line === '};') {
        functionEndLine = i;
        inFunctionExport = false;
    }
    
    // Find duplicate module.exports after the function
    if (i > functionEndLine && functionEndLine !== -1 && 
        line === 'module.exports = router;') {
        duplicateExportLine = i;
    }
}

if (duplicateExportLine !== -1) {
    // Remove the duplicate line
    lines.splice(duplicateExportLine, 1);
    console.log('✅ Removed duplicate module.exports = router;');
    
    // Write fixed content
    fs.writeFileSync(authRoutesPath, lines.join('\n'));
    console.log('✅ Fixed authRoutes.js');
    
    // Verify the fix
    console.log('\n📄 Checking fixed authRoutes.js structure:');
    const fixedContent = fs.readFileSync(authRoutesPath, 'utf8');
    const moduleExports = fixedContent.match(/module\.exports/g) || [];
    console.log(`Found ${moduleExports.length} module.exports statements`);
    
    if (moduleExports.length === 1) {
        console.log('✅ Structure is correct - single module.exports');
    }
} else {
    console.log('❌ Could not find duplicate module.exports');
    console.log('The file structure may be different. Showing last 10 lines:');
    console.log('-'.repeat(60));
    console.log(lines.slice(-10).join('\n'));
    console.log('-'.repeat(60));
}