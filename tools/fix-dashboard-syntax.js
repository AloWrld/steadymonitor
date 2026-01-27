#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const dashboardPath = path.join(projectRoot, 'backend', 'routes', 'dashboardRoutes.js');

console.log('🔧 Fixing dashboardRoutes.js syntax error...\n');

// Read the file
let content = fs.readFileSync(dashboardPath, 'utf8');

// Backup
const backupPath = dashboardPath + '.backup-' + Date.now();
fs.writeFileSync(backupPath, content);
console.log(`📦 Created backup: ${backupPath}`);

// Check around line 98
const lines = content.split('\n');
console.log('Lines around the error (95-105):');
console.log('-'.repeat(60));
for (let i = 94; i < Math.min(105, lines.length); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
console.log('-'.repeat(60));

// Let's look for the specific issue
let issueFound = false;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for a line with just ");" which might be causing the issue
    if (line === ');' && i > 0 && lines[i-1].trim() !== '') {
        console.log(`Found potential issue at line ${i + 1}: "${line}"`);
        
        // Check the previous lines to see what this is closing
        let j = i - 1;
        let openParens = 1; // Starting with the one we found
        let foundOpening = false;
        
        while (j >= 0 && !foundOpening) {
            const prevLine = lines[j];
            // Count parentheses in this line
            const openInLine = (prevLine.match(/\(/g) || []).length;
            const closeInLine = (prevLine.match(/\)/g) || []).length;
            
            openParens += (closeInLine - openInLine);
            
            if (openParens === 0) {
                console.log(`This ")" closes something starting around line ${j + 1}`);
                console.log(`Previous line (${j + 1}): ${prevLine.trim()}`);
                foundOpening = true;
                
                // Check if this is a function call without proper arguments
                if (prevLine.includes('router.') && prevLine.includes('(') && 
                    !prevLine.includes('async') && !prevLine.includes('function')) {
                    console.log('⚠️  Looks like a route definition might be malformed');
                    issueFound = true;
                }
            }
            j--;
        }
    }
}

// If we couldn't find the issue automatically, let me provide a clean version
console.log('\n🔄 Creating clean dashboardRoutes.js...');

const cleanDashboard = `const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');

// GET dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await dashboardService.getDashboardStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// GET low stock items
router.get('/low-stock', async (req, res) => {
    try {
        const lowStock = await dashboardService.getLowStockItems();
        res.json(lowStock);
    } catch (error) {
        console.error('Error fetching low stock items:', error);
        res.status(500).json({ error: 'Failed to fetch low stock items' });
    }
});

// GET recent sales
router.get('/recent-sales', async (req, res) => {
    try {
        const recentSales = await dashboardService.getRecentSales();
        res.json(recentSales);
    } catch (error) {
        console.error('Error fetching recent sales:', error);
        res.status(500).json({ error: 'Failed to fetch recent sales' });
    }
});

// GET customer balances
router.get('/customers-balance', async (req, res) => {
    try {
        const balances = await dashboardService.getCustomerBalances();
        res.json(balances);
    } catch (error) {
        console.error('Error fetching customer balances:', error);
        res.status(500).json({ error: 'Failed to fetch customer balances' });
    }
});

module.exports = router;`;

// Write the clean version
fs.writeFileSync(dashboardPath, cleanDashboard);
console.log('✅ Created clean dashboardRoutes.js');

// Verify it works
console.log('\n🧪 Verifying syntax...');
try {
    require(dashboardPath);
    console.log('✅ Syntax check passed!');
} catch (error) {
    console.log('❌ Still has syntax error:', error.message);
}

console.log('\nNow try: node server.js');