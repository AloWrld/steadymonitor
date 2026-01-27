#!/usr/bin/env node

/**
 * Fix duplicate route declarations in route files
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const backendRoutesDir = path.join(projectRoot, 'backend', 'routes');

// Files that need fixing
const filesToFix = ['dashboardRoutes.js', 'posRoutes.js'];

function fixRouteFile(filename) {
  const filePath = path.join(backendRoutesDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${filename} does not exist`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Create backup
  const backupPath = filePath + '.backup-' + Date.now();
  fs.copyFileSync(filePath, backupPath);
  console.log(`📦 Created backup: ${backupPath}`);
  
  // Check for duplicate const declarations
  if (filename === 'dashboardRoutes.js') {
    // Find duplicate express declaration
    const lines = content.split('\n');
    const uniqueLines = [];
    const seenLines = new Set();
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip duplicate const declarations
      if (trimmedLine.startsWith('const express = require') && seenLines.has('express')) {
        console.log(`➖ Removing duplicate express declaration in ${filename}`);
        continue;
      }
      
      // Track seen declarations
      if (trimmedLine.startsWith('const ')) {
        const varName = trimmedLine.match(/const\s+(\w+)\s*=/);
        if (varName) {
          if (seenLines.has(varName[1])) {
            console.log(`➖ Removing duplicate ${varName[1]} declaration in ${filename}`);
            continue;
          }
          seenLines.add(varName[1]);
        }
      }
      
      uniqueLines.push(line);
    }
    
    content = uniqueLines.join('\n');
  }
  
  // Write fixed content
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed ${filename}`);
}

// Main function
function main() {
  console.log('🔧 Fixing duplicate route declarations...\n');
  
  filesToFix.forEach(fixRouteFile);
  
  console.log('\n✅ Fix completed!');
  console.log('\nNow run: node server.js');
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}