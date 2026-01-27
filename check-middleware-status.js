// check-middleware-status.js
const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, 'backend', 'routes');
const MIDDLEWARE_FILE = path.join(__dirname, 'backend', 'middleware', 'authMiddleware.js');

console.log('🔍 Current Middleware Status Report');
console.log('=' .repeat(60));

// Check authMiddleware.js
console.log('\n📁 authMiddleware.js:');
try {
    const middlewareContent = fs.readFileSync(MIDDLEWARE_FILE, 'utf8');
    
    const hasRequireAuth = middlewareContent.includes('function requireAuth');
    const hasRequirePermission = middlewareContent.includes('function requirePermission');
    
    console.log(`   ✓ requireAuth function: ${hasRequireAuth ? 'YES' : 'NO'}`);
    console.log(`   ✓ requirePermission function: ${hasRequirePermission ? 'YES' : 'NO'}`);
    
    // Check exports
    const exportMatch = middlewareContent.match(/module\.exports\s*=\s*{([^}]+)}/);
    if (exportMatch) {
        const exports = exportMatch[1].split(',').map(e => e.trim());
        console.log(`   📤 Exported functions: ${exports.join(', ')}`);
    }
} catch (error) {
    console.log(`   ❌ Error reading file: ${error.message}`);
}

// Check all route files
console.log('\n📁 Route Files Analysis:');
console.log('-' .repeat(60));

const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('Routes.js'));
let totalRoutes = 0;
let protectedRoutes = 0;

files.forEach(file => {
    const content = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
    const lines = content.split('\n');
    
    // Count routes
    const routeLines = lines.filter(line => line.includes('router.'));
    const routesInFile = routeLines.filter(line => 
        line.match(/router\.(get|post|put|delete|patch)\(['"`]/) && 
        !line.includes('module.exports')
    ).length;
    
    const protectedInFile = routeLines.filter(line => 
        line.includes('requirePermission') || line.includes('requireAuth') || line.includes('authMiddleware')
    ).length;
    
    totalRoutes += routesInFile;
    protectedRoutes += protectedInFile;
    
    console.log(`\n📄 ${file}:`);
    console.log(`   Total routes: ${routesInFile}`);
    console.log(`   Protected routes: ${protectedInFile}`);
    console.log(`   Unprotected routes: ${routesInFile - protectedInFile}`);
    
    // Check imports
    const imports = lines.slice(0, 10).filter(line => 
        line.includes('require') || line.includes('import')
    ).map(line => line.trim());
    
    if (imports.length > 0) {
        console.log(`   Imports:`);
        imports.forEach(imp => console.log(`     ${imp}`));
    }
});

console.log('\n' + '=' .repeat(60));
console.log('📊 SUMMARY:');
console.log('=' .repeat(60));
console.log(`Total route files: ${files.length}`);
console.log(`Total API routes: ${totalRoutes}`);
console.log(`Protected routes: ${protectedRoutes} (${Math.round((protectedRoutes/totalRoutes)*100)}%)`);
console.log(`Unprotected routes: ${totalRoutes - protectedRoutes}`);

if (totalRoutes - protectedRoutes > 0) {
    console.log('\n⚠️  WARNING: Some routes are unprotected!');
    console.log('   Run the fix script to standardize middleware usage.');
}