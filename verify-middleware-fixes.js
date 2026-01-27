#!/usr/bin/env node
// verify-middleware-fixes.js
const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, 'backend', 'routes');
const MIDDLEWARE_FILE = path.join(__dirname, 'backend', 'middleware', 'authMiddleware.js');
const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('Routes.js'));

console.log('🔍 Verifying Middleware Standardization');
console.log('='.repeat(60));

// Check authMiddleware.js
console.log('\n📁 authMiddleware.js:');
const middlewareContent = fs.readFileSync(MIDDLEWARE_FILE, 'utf8');
const hasRequireAuth = middlewareContent.includes('function requireAuth');
const hasRequirePermission = middlewareContent.includes('function requirePermission');
const exportsMatch = middlewareContent.match(/module\.exports\s*=\s*{([^}]+)}/);
const exportedFunctions = exportsMatch ? exportsMatch[1].split(',').map(e => e.trim()) : [];

console.log(`   ✓ requireAuth function: ${hasRequireAuth ? '✅ YES' : '❌ NO'}`);
console.log(`   ✓ requirePermission function: ${hasRequirePermission ? '✅ YES' : '❌ NO'}`);
console.log(`   📤 Exported: ${exportedFunctions.join(', ')}`);

// Route configuration
const ROUTE_CONFIG = {
    'allocationRoutes.js': { permission: 'allocations', hasCustomAuth: false },
    'authRoutes.js': { permission: null, hasCustomAuth: false },
    'checkoutRoutes.js': { permission: 'pos', hasCustomAuth: false },
    'customerRoutes.js': { permission: 'customers', hasCustomAuth: false },
    'dashboardRoutes.js': { permission: 'dashboard', hasCustomAuth: true },
    'inventoryRoutes.js': { permission: 'inventory', hasCustomAuth: false },
    'paymentRoutes.js': { permission: 'payments', hasCustomAuth: false },
    'pocketMoneyRoutes.js': { permission: 'pocket_money', hasCustomAuth: false },
    'posRoutes.js': { permission: 'pos', hasCustomAuth: true },
    'printRoutes.js': { permission: 'pos', hasCustomAuth: false },
    'refundRoutes.js': { permission: 'refunds', hasCustomAuth: false },
    'reportRoutes.js': { permission: 'reports', hasCustomAuth: false },
    'supplierRoutes.js': { permission: 'suppliers', hasCustomAuth: false }
};

let totalRoutes = 0;
let protectedRoutes = 0;
let customAuthRoutes = 0;

console.log('\n📁 Route Files Analysis:');
console.log('─'.repeat(60));

files.forEach(file => {
    const content = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
    const lines = content.split('\n');
    const config = ROUTE_CONFIG[file] || { permission: null, hasCustomAuth: false };
    
    // Check imports
    const hasPermissionImport = lines.some(line => line.includes('requirePermission'));
    const hasRequireAuthImport = lines.some(line => line.includes('requireAuth'));
    
    // Count routes
    const routeLines = lines.filter(line => line.includes('router.'));
    const routesInFile = routeLines.filter(line => 
        line.match(/router\.(get|post|put|delete|patch)\(['"`]/) && 
        !line.includes('module.exports')
    ).length;
    
    const protectedInFile = routeLines.filter(line => 
        line.includes('requirePermission') || line.includes('requireAuth') || 
        (config.hasCustomAuth && line.includes('async (req, res) => {'))
    ).length;
    
    totalRoutes += routesInFile;
    protectedRoutes += protectedInFile;
    if (config.hasCustomAuth) customAuthRoutes += routesInFile;
    
    const status = config.hasCustomAuth ? '🔧 Custom Auth' : 
                  config.permission ? '🔒 Protected' : '🌐 Public';
    
    console.log(`\n📄 ${file} (${status}):`);
    console.log(`   Routes: ${routesInFile} total, ${protectedInFile} protected`);
    console.log(`   Imports: ${hasPermissionImport ? '✅ requirePermission' : ''} ${hasRequireAuthImport ? '✅ requireAuth' : ''}`.trim());
    
    // Check for manual auth checks in custom auth files
    if (config.hasCustomAuth) {
        const manualChecks = lines.filter(line => 
            line.includes('req.user') || 
            line.includes('!req.user') ||
            line.includes('req.headers.authorization')
        ).length;
        
        if (manualChecks > 0) {
            console.log(`   ⚡ Manual auth checks: ${manualChecks}`);
        }
    }
});

console.log('\n' + '='.repeat(60));
console.log('📊 FINAL SUMMARY:');
console.log('='.repeat(60));
console.log(`Total route files: ${files.length}`);
console.log(`Total API routes: ${totalRoutes}`);
console.log(`Protected routes: ${protectedRoutes} (${Math.round((protectedRoutes/totalRoutes)*100)}%)`);
console.log(`Custom auth routes: ${customAuthRoutes}`);
console.log(`Unprotected routes: ${totalRoutes - protectedRoutes}`);

if (totalRoutes - protectedRoutes > 0) {
    console.log('\n⚠️  WARNING: Some routes may be unprotected!');
    console.log('   Check authRoutes.js for public routes.');
}

console.log('\n✅ Verification complete!');
