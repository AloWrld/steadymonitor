#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ROOT = process.cwd();
const DIAGNOSTIC_REPORT = path.join(PROJECT_ROOT, 'DIAGNOSTIC_REPORT.md');
const ERROR_LOG = path.join(PROJECT_ROOT, 'DIAGNOSTIC_ERRORS.log');

console.log('🔍 STEADYMONITOR Project Diagnostic Tool (Windows)');
console.log('==================================================\n');

// Clear previous reports
if (fs.existsSync(DIAGNOSTIC_REPORT)) fs.unlinkSync(DIAGNOSTIC_REPORT);
if (fs.existsSync(ERROR_LOG)) fs.unlinkSync(ERROR_LOG);

const report = [];
const errors = [];
let issuesFound = 0;

/**
 * Log to report and console
 */
function logToReport(title, content = '', isError = false) {
    const entry = `## ${title}\n\n${content}\n`;
    report.push(entry);
    
    if (isError) {
        errors.push(`❌ ${title}\n${content}\n`);
        issuesFound++;
    }
    
    console.log(isError ? `❌ ${title}` : `✅ ${title}`);
    if (content) console.log(`   ${content}\n`);
}

/**
 * Check file existence
 */
function checkFileExists(filePath, description) {
    try {
        const fullPath = path.join(PROJECT_ROOT, filePath);
        if (fs.existsSync(fullPath)) {
            logToReport(`File Check: ${description}`, `✓ ${fullPath} exists`);
            return true;
        } else {
            logToReport(`Missing File: ${description}`, `✗ ${fullPath} NOT FOUND`, true);
            return false;
        }
    } catch (err) {
        logToReport(`File Check Error: ${description}`, err.message, true);
        return false;
    }
}

/**
 * Find files recursively (Windows compatible)
 */
function findFiles(dir, pattern, results = []) {
    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                // Skip node_modules and .git
                if (item.name !== 'node_modules' && item.name !== '.git') {
                    findFiles(fullPath, pattern, results);
                }
            } else if (item.isFile() && item.name.match(pattern)) {
                results.push(fullPath);
            }
        }
    } catch (err) {
        // Directory might not exist or have permissions issues
    }
    
    return results;
}

/**
 * Read and analyze a file
 */
function analyzeFile(filePath, type) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const issues = [];
        
        // Common patterns to check
        const patterns = {
            javascript: [
                { pattern: /window\.location\.href.*login\.html/, issue: 'Hardcoded login redirect' },
                { pattern: /localhost.*3001/, issue: 'Hardcoded localhost:3001' },
                { pattern: /fetch.*then.*catch/, issue: 'Promise chain (consider async/await)' },
                { pattern: /console\.log/, issue: 'Console.log in production code' },
                { pattern: /query.*\$1.*\$2/, issue: 'Potential SQL injection risk' },
                { pattern: /pool\.query.*\{.*\}/s, issue: 'Check query parameters' }
            ],
            html: [
                { pattern: /href="\//, issue: 'Absolute paths - may fail in production' },
                { pattern: /src="http:\/\/localhost/, issue: 'Hardcoded localhost in src' },
                { pattern: /<label(?!.*for=)/, issue: 'Label without for attribute' },
                { pattern: /<input(?!.*id=)/, issue: 'Input without id' }
            ]
        };
        
        if (patterns[type]) {
            patterns[type].forEach(({ pattern, issue }) => {
                const matches = content.match(pattern);
                if (matches) {
                    issues.push(`${issue} (found ${matches.length} times)`);
                }
            });
        }
        
        // Check for specific errors
        if (content.includes('404') || content.includes('Not Found')) {
            issues.push('Contains 404/Not Found references');
        }
        
        if (content.includes('undefined') || content.includes('null')) {
            issues.push('Contains undefined/null checks');
        }
        
        if (content.includes('TODO') || content.includes('FIXME')) {
            issues.push('Contains TODO/FIXME comments');
        }
        
        return {
            path: filePath,
            size: content.length,
            lines: content.split('\n').length,
            issues: issues.length > 0 ? issues : ['No issues found']
        };
        
    } catch (err) {
        return {
            path: filePath,
            error: err.message,
            issues: ['Cannot read file']
        };
    }
}

/**
 * Check database configuration
 */
function checkDatabaseConfig() {
    console.log('\n🔧 Checking Database Configuration...\n');
    
    // Check specific database files
    const dbFiles = [
        'backend/config/database.js',
        '.env'
    ];
    
    // Also find service files
    const servicesDir = path.join(PROJECT_ROOT, 'backend/services');
    if (fs.existsSync(servicesDir)) {
        const serviceFiles = fs.readdirSync(servicesDir)
            .filter(f => f.endsWith('.js'))
            .map(f => path.join('backend/services', f));
        dbFiles.push(...serviceFiles);
    }
    
    dbFiles.forEach(file => {
        const fullPath = path.join(PROJECT_ROOT, file);
        if (fs.existsSync(fullPath)) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                
                // Check for database connection issues
                if (content.includes('pool.query') || content.includes('pool.connect')) {
                    const hasErrorHandling = content.includes('.catch') || content.includes('try {') || content.includes('async');
                    
                    if (!hasErrorHandling) {
                        logToReport(`Database Query in ${file}`, 'Missing error handling', true);
                    }
                }
                
                // Check for PostgreSQL syntax
                if (content.includes('$1') && !content.includes('query(')) {
                    logToReport(`Potential SQL Issue in ${file}`, 'Parameterized query without proper context', true);
                }
                
            } catch (err) {
                // File might not exist, that's OK
            }
        }
    });
    
    // Check .env file
    const envPath = path.join(PROJECT_ROOT, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        const requiredVars = [
            'DATABASE_URL',
            'SESSION_SECRET',
            'PORT'
        ];
        
        requiredVars.forEach(varName => {
            if (!envContent.includes(varName)) {
                logToReport(`Missing .env variable`, `${varName} not found`, true);
            }
        });
    } else {
        logToReport('Missing .env file', 'Environment configuration file not found', true);
    }
}

/**
 * Check all HTML files for errors
 */
function checkHTMLFiles() {
    console.log('\n🌐 Checking HTML Files...\n');
    
    const htmlFiles = findFiles(PROJECT_ROOT, /\.html$/);
    
    htmlFiles.forEach(file => {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const relativePath = path.relative(PROJECT_ROOT, file);
            
            // Check for common issues
            const issues = [];
            
            // Check for missing favicons
            if (content.includes('favicon') && !content.includes('favicon.ico')) {
                const dir = path.dirname(file);
                if (!fs.existsSync(path.join(dir, 'favicon.ico'))) {
                    issues.push('Missing favicon.ico file');
                }
            }
            
            // Check for absolute paths
            const absolutePathMatches = content.match(/src="\/[^"]+"/g) || [];
            absolutePathMatches.forEach(match => {
                const src = match.match(/src="(\/[^"]+)"/)[1];
                const fullPath = path.join(PROJECT_ROOT, 'frontend', src.replace(/^\//, ''));
                if (!fs.existsSync(fullPath)) {
                    issues.push(`Missing file: ${src}`);
                }
            });
            
            // Check for script loading order
            const scripts = (content.match(/<script[^>]*src="([^"]+)"[^>]*>/g) || [])
                .map(match => match.match(/src="([^"]+)"/)[1]);
            
            // Check if required scripts exist
            scripts.forEach(scriptSrc => {
                if (!scriptSrc.startsWith('http')) {
                    const scriptPath = path.join(path.dirname(file), scriptSrc);
                    if (!fs.existsSync(scriptPath)) {
                        issues.push(`Missing script: ${scriptSrc}`);
                    }
                }
            });
            
            // Check for label/input associations
            const labelPattern = /<label(?!.*for=)[^>]*>/g;
            const labelMatches = content.match(labelPattern);
            if (labelMatches) {
                issues.push(`Found ${labelMatches.length} label(s) without 'for' attribute`);
            }
            
            if (issues.length > 0) {
                logToReport(`HTML Issues: ${relativePath}`, issues.join('\n- '), true);
            }
            
        } catch (err) {
            logToReport(`Error reading HTML: ${file}`, err.message, true);
        }
    });
}

/**
 * Check JavaScript files
 */
function checkJavaScriptFiles() {
    console.log('\n📜 Checking JavaScript Files...\n');
    
    const jsFiles = findFiles(PROJECT_ROOT, /\.js$/).filter(file => 
        !file.includes('node_modules') && 
        !file.includes('.git')
    );
    
    jsFiles.forEach(file => {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const relativePath = path.relative(PROJECT_ROOT, file);
            
            // Skip very large files
            if (content.length > 100000) {
                return;
            }
            
            const issues = [];
            
            // Check for API endpoint issues
            if (content.includes('fetch(') || content.includes('axios(')) {
                const apiCalls = content.match(/fetch\(['"`]([^'"`]+)['"`]/g) || [];
                apiCalls.forEach(call => {
                    const url = call.match(/fetch\(['"`]([^'"`]+)['"`]/)[1];
                    
                    // Check for localhost in production code
                    if (url.includes('localhost:3001') && file.includes('frontend')) {
                        issues.push(`Hardcoded localhost: ${url}`);
                    }
                    
                    // Check for missing error handling
                    const lines = content.split('\n');
                    const callIndex = lines.findIndex(line => line.includes(call));
                    if (callIndex !== -1) {
                        const nextLines = lines.slice(callIndex, callIndex + 5).join('\n');
                        if (!nextLines.includes('.catch') && !nextLines.includes('try {') && !nextLines.includes('async')) {
                            issues.push('API call missing error handling');
                        }
                    }
                });
            }
            
            // Check for database queries
            if (content.includes('pool.query') || content.includes('client.query')) {
                const queries = content.match(/pool\.query\(['"`]([^'"`]+)['"`]/g) || [];
                queries.forEach(query => {
                    // Check for SQL injection vulnerabilities
                    const sql = query.match(/pool\.query\(['"`]([^'"`]+)['"`]/)[1];
                    if (sql.includes('${') || sql.includes(' + ')) {
                        issues.push('Potential SQL injection: string concatenation in query');
                    }
                });
            }
            
            // Check for undefined variables
            const undefinedChecks = content.match(/undefined|typeof.*===.*undefined/g) || [];
            if (undefinedChecks.length > 5) {
                issues.push('Multiple undefined checks - consider refactoring');
            }
            
            // Check for console.log in production
            if (content.includes('console.log') && !file.includes('test') && !file.includes('debug')) {
                issues.push('Contains console.log statements');
            }
            
            // Check for missing imports
            if (content.includes('require(') || content.includes('import ')) {
                const requireStatements = content.match(/require\(['"`]([^'"`]+)['"`]\)/g) || [];
                requireStatements.forEach(req => {
                    const modulePath = req.match(/require\(['"`]([^'"`]+)['"`]\)/)[1];
                    
                    // Check if local module exists
                    if (modulePath.startsWith('.') && !modulePath.includes('node_modules')) {
                        const moduleFullPath = path.join(path.dirname(file), modulePath);
                        if (!fs.existsSync(moduleFullPath) && !fs.existsSync(moduleFullPath + '.js')) {
                            issues.push(`Missing module: ${modulePath}`);
                        }
                    }
                });
            }
            
            if (issues.length > 0) {
                logToReport(`JS Issues: ${relativePath}`, issues.join('\n- '), true);
            }
            
        } catch (err) {
            logToReport(`Error reading JS: ${file}`, err.message, true);
        }
    });
}

/**
 * Test API endpoints (simulated)
 */
async function testAPIEndpoints() {
    console.log('\n🔌 Checking API Routes...\n');
    
    const routesDir = path.join(PROJECT_ROOT, 'backend/routes');
    if (fs.existsSync(routesDir)) {
        const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
        
        routeFiles.forEach(file => {
            const routeName = file.replace('Routes.js', '').toLowerCase();
            logToReport(`Route File: ${file}`, `Found ${routeName} routes`);
            
            // Check if route file has proper exports
            try {
                const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
                if (!content.includes('module.exports') && !content.includes('export default')) {
                    logToReport(`Route Export Issue: ${file}`, 'Missing module.exports', true);
                }
                
                // Check for common route patterns
                const endpoints = [];
                const routerPattern = /router\.(get|post|put|delete)\(['"`]([^'"`]+)/g;
                let match;
                while ((match = routerPattern.exec(content)) !== null) {
                    endpoints.push(`${match[1].toUpperCase()} ${match[2]}`);
                }
                
                if (endpoints.length > 0) {
                    logToReport(`Endpoints in ${file}`, endpoints.join('\n- '));
                } else {
                    logToReport(`No endpoints found in ${file}`, 'Check router definitions', true);
                }
                
            } catch (err) {
                logToReport(`Error reading route: ${file}`, err.message, true);
            }
        });
    } else {
        logToReport('Missing routes directory', 'backend/routes not found', true);
    }
}

/**
 * Check for missing dependencies
 */
function checkDependencies() {
    console.log('\n📦 Checking Dependencies...\n');
    
    const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            // Check for required dependencies
            const requiredDeps = [
                'express',
                'pg',
                'cors',
                'dotenv',
                'express-session'
            ];
            
            requiredDeps.forEach(dep => {
                if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
                    logToReport(`Missing Dependency`, `${dep} not in package.json`, true);
                }
            });
            
            // Check scripts
            if (!packageJson.scripts?.start) {
                logToReport('Missing start script', 'package.json missing start script', true);
            }
            
            // Check node version
            if (packageJson.engines?.node) {
                logToReport('Node.js Version', `Requires: ${packageJson.engines.node}`);
            }
            
        } catch (err) {
            logToReport('Error reading package.json', err.message, true);
        }
    } else {
        logToReport('Missing package.json', 'Project package.json not found', true);
    }
}

/**
 * Check database connection directly
 */
async function checkDatabaseConnection() {
    console.log('\n🗄️  Testing Database Connection...\n');
    
    try {
        // Try to load database config
        const dbConfigPath = path.join(PROJECT_ROOT, 'backend/config/database.js');
        if (fs.existsSync(dbConfigPath)) {
            const dbConfig = require(dbConfigPath);
            
            if (dbConfig.pool) {
                try {
                    const client = await dbConfig.pool.connect();
                    logToReport('Database Connection', '✅ Connected successfully');
                    
                    // Try a simple query
                    const result = await client.query('SELECT NOW()');
                    logToReport('Database Query', `✅ Server time: ${result.rows[0].now}`);
                    
                    client.release();
                    
                } catch (err) {
                    logToReport('Database Connection Failed', err.message, true);
                }
            } else {
                logToReport('Database Configuration', 'No pool object found in database.js', true);
            }
        } else {
            logToReport('Database Config Missing', 'database.js not found', true);
        }
    } catch (err) {
        logToReport('Database Check Error', err.message, true);
    }
}

/**
 * Main diagnostic function
 */
async function runDiagnostic() {
    console.log('🚀 Starting comprehensive project diagnostic...\n');
    
    // 1. Check critical files
    logToReport('Critical File Check', 'Checking essential project files...');
    
    const criticalFiles = [
        'server.js',
        'package.json',
        'package-lock.json',
        '.env',
        'backend/config/database.js',
        'frontend/login.html',
        'frontend/admin.html'
    ];
    
    criticalFiles.forEach(file => {
        checkFileExists(file, file);
    });
    
    // 2. Check project structure
    const requiredDirs = [
        'backend',
        'backend/config',
        'backend/routes',
        'backend/services',
        'backend/middleware',
        'frontend',
        'frontend/css',
        'frontend/js',
        'CSV'
    ];
    
    requiredDirs.forEach(dir => {
        const dirPath = path.join(PROJECT_ROOT, dir);
        if (fs.existsSync(dirPath)) {
            logToReport(`Directory: ${dir}`, `✓ ${dir} exists`);
            
            // Count files in directory
            try {
                const files = fs.readdirSync(dirPath);
                logToReport(`Files in ${dir}`, `${files.length} files found`);
            } catch (err) {
                // Might not have permission
            }
        } else {
            logToReport(`Missing Directory: ${dir}`, `✗ ${dir} NOT FOUND`, true);
        }
    });
    
    // 3. Run various checks
    checkDatabaseConfig();
    checkHTMLFiles();
    checkJavaScriptFiles();
    checkDependencies();
    await testAPIEndpoints();
    await checkDatabaseConnection();
    
    // 4. Generate final report
    generateFinalReport();
}

/**
 * Generate final report
 */
function generateFinalReport() {
    const timestamp = new Date().toISOString();
    
    const reportContent = `# STEADYMONITOR Project Diagnostic Report
Generated: ${timestamp}

## Summary
- Total Issues Found: ${issuesFound}
- ${issuesFound === 0 ? '✅ No issues found!' : '⚠️ Issues detected!'}

## Issues Found
${errors.length > 0 ? errors.join('\n') : 'No errors found.'}

## Detailed Report
${report.join('\n')}

## Recommendations
${issuesFound > 0 ? `
1. **Fix missing files first** - Start with files showing 404 errors
2. **Check database connections** - Verify .env and database.js configuration
3. **Test API endpoints** - Ensure routes are properly exporting
4. **Update dependencies** - Check for missing packages in package.json
5. **Fix HTML warnings** - Add missing labels and fix paths
` : '✅ Project appears to be in good condition!'}

## Next Steps
1. Review the errors above
2. Fix one category at a time
3. Test after each fix
4. Run this diagnostic again to verify fixes

---
*Diagnostic completed at ${timestamp}*
`;
    
    fs.writeFileSync(DIAGNOSTIC_REPORT, reportContent);
    fs.writeFileSync(ERROR_LOG, errors.join('\n'));
    
    console.log('\n========================================');
    console.log(`📊 Diagnostic Complete!`);
    console.log(`📄 Full report: ${DIAGNOSTIC_REPORT}`);
    console.log(`📝 Error log: ${ERROR_LOG}`);
    console.log(`🔧 Issues found: ${issuesFound}`);
    console.log('========================================\n');
    
    if (issuesFound > 0) {
        console.log('🚨 ISSUES FOUND:');
        errors.forEach(error => console.log(`  ${error.split('\n')[0]}`));
        console.log('\n💡 Run: node fix-database-connections-windows.js to automatically fix some issues.');
    } else {
        console.log('✅ No issues found! Your project looks good.');
    }
}

/**
 * Create a fix script for database connections (Windows compatible)
 */
function createFixScript() {
    const fixScript = `#!/usr/bin/env node

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
        content = "const { Pool } = require('pg');\\n" + content;
        fixes.push('Added pg import to database.js');
    }
    
    if (!content.includes('module.exports')) {
        content += '\\n\\nmodule.exports = { pool, query };';
        fixes.push('Added exports to database.js');
    }
    
    fs.writeFileSync(dbConfigPath, content);
}

// 2. Check .env file
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    const envTemplate = \`DATABASE_URL=postgresql://username:password@localhost:5432/steadymonitor
SESSION_SECRET=your-secret-key-here-change-in-production
PORT=3001
NODE_ENV=development\`;
    
    fs.writeFileSync(envPath, envTemplate);
    fixes.push('Created .env file with template');
} else {
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (!envContent.includes('DATABASE_URL')) {
        fs.appendFileSync(envPath, '\\nDATABASE_URL=postgresql://username:password@localhost:5432/steadymonitor');
        fixes.push('Added DATABASE_URL to .env');
    }
}

// 3. Fix server.js database initialization
const serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    let content = fs.readFileSync(serverPath, 'utf8');
    
    // Add database test route
    if (!content.includes('/api/test-db')) {
        const testRoute = \`
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
\`;
        
        // Insert before the app.listen
        const lines = content.split('\\n');
        const listenIndex = lines.findIndex(line => line.includes('app.listen'));
        if (listenIndex > -1) {
            lines.splice(listenIndex, 0, testRoute);
            content = lines.join('\\n');
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
            content = "const { query } = require('../config/database');\\n" + content;
            modified = true;
        }
        
        // Fix query calls
        if (content.includes('pool.query') && !content.includes('query(')) {
            content = content.replace(/pool\\.query/g, 'query');
            modified = true;
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content);
            fixes.push(\`Fixed database imports in \${file}\`);
        }
    });
}

console.log('\\n✅ Fixes applied:');
fixes.forEach(fix => console.log(\`  ✓ \${fix}\`));

if (fixes.length > 0) {
    console.log('\\n🚀 Restart your server to apply changes:');
    console.log('   npm start');
} else {
    console.log('\\n✅ No fixes needed.');
}
`;

    const fixScriptPath = path.join(PROJECT_ROOT, 'fix-database-connections-windows.js');
    fs.writeFileSync(fixScriptPath, fixScript);
    
    console.log(`\n🛠️  Created fix script: ${fixScriptPath}`);
    console.log('Run: node fix-database-connections-windows.js');
}

// Run the diagnostic
runDiagnostic().then(() => {
    createFixScript();
}).catch(err => {
    console.error('Diagnostic failed:', err);
    process.exit(1);
});