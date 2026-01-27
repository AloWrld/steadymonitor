#!/usr/bin/env node

/**
 * Database Connection Fix Script (Windows Compatible)
 * Automatically fixes common database connection issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing database connections...');

const fixes = [];

// 1. Fix database.js connection
const dbConfigPath = path.join(__dirname, 'backend/config/database.js');
if (fs.existsSync(dbConfigPath)) {
    let content = fs.readFileSync(dbConfigPath, 'utf8');
    
    // Check for common issues
    if (!content.includes("require('pg')")) {
        content = "const { Pool } = require('pg');\n" + content;
        fixes.push('Added pg import to database.js');
    }
    
    if (!content.includes('module.exports')) {
        content += '\n\nmodule.exports = { pool, query };';
        fixes.push('Added exports to database.js');
    }
    
    fs.writeFileSync(dbConfigPath, content);
}

// 2. Check .env file
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    const envTemplate = `DATABASE_URL=postgresql://username:password@localhost:5432/steadymonitor
SESSION_SECRET=your-secret-key-here-change-in-production
PORT=3001
NODE_ENV=development`;
    
    fs.writeFileSync(envPath, envTemplate);
    fixes.push('Created .env file with template');
} else {
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (!envContent.includes('DATABASE_URL')) {
        fs.appendFileSync(envPath, '\nDATABASE_URL=postgresql://username:password@localhost:5432/steadymonitor');
        fixes.push('Added DATABASE_URL to .env');
    }
}

// 3. Fix server.js database initialization
const serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    let content = fs.readFileSync(serverPath, 'utf8');
    
    // Add database test route
    if (!content.includes('/api/test-db')) {
        const testRoute = `
// Test database connection
app.get('/api/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ 
            success: true, 
            message: 'Database connected successfully',
            timestamp: result.rows[0].now 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Database connection failed',
            error: error.message 
        });
    }
});
`;
        
        // Insert before the app.listen
        const lines = content.split('\n');
        const listenIndex = lines.findIndex(line => line.includes('app.listen'));
        if (listenIndex > -1) {
            lines.splice(listenIndex, 0, testRoute);
            content = lines.join('\n');
            fixes.push('Added database test route to server.js');
        }
    }
    
    fs.writeFileSync(serverPath, content);
}

// 4. Check all service files for proper database imports
const servicesDir = path.join(__dirname, 'backend/services');
if (fs.existsSync(servicesDir)) {
    const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));
    
    serviceFiles.forEach(file => {
        const filePath = path.join(servicesDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        // Add database import if missing
        if (!content.includes("require('../config/database')") && 
            !content.includes("from '../config/database'")) {
            content = "const { query } = require('../config/database');\n" + content;
            modified = true;
        }
        
        // Fix query calls
        if (content.includes('pool.query') && !content.includes('query(')) {
            content = content.replace(/pool\.query/g, 'query');
            modified = true;
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content);
            fixes.push(`Fixed database imports in ${file}`);
        }
    });
}

console.log('\n✅ Fixes applied:');
fixes.forEach(fix => console.log(`  ✓ ${fix}`));

if (fixes.length > 0) {
    console.log('\n🚀 Restart your server to apply changes:');
    console.log('   npm start');
} else {
    console.log('\n✅ No fixes needed.');
}
