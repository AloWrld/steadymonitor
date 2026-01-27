#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = process.cwd();
const FRONTEND_DIR = path.join(PROJECT_ROOT, 'frontend');
const BACKEND_DIR = path.join(PROJECT_ROOT, 'backend');

console.log('🔍 Auditing Authentication Usage Across Project...\n');

// Files to check for auth usage
const AUTH_PATTERNS = [
    // Frontend patterns
    /auth\.requireAuth/,
    /auth\.init/,
    /auth\.checkAuth/,
    /auth\.getUser/,
    /auth\.login/,
    /auth\.logout/,
    /localStorage\.(get|set)Item.*user/,
    /sessionStorage\.(get|set)Item.*user/,
    /credentials.*include/,
    /fetch.*auth/,
    
    // Backend patterns
    /requireAuth/,
    /authMiddleware/,
    /isAuthenticated/,
    /checkAuth/,
    /req\.user/,
    /req\.session/,
    /session/,
    /passport/,
    /jwt/
];

// File extensions to check
const CHECK_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.html'];

async function findFiles(dir, extensions) {
    const files = [];
    
    function scan(directory) {
        const items = fs.readdirSync(directory, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(directory, item.name);
            
            if (item.isDirectory()) {
                // Skip node_modules and .git
                if (!item.name.includes('node_modules') && !item.name.includes('.git')) {
                    scan(fullPath);
                }
            } else if (extensions.some(ext => item.name.endsWith(ext))) {
                files.push(fullPath);
            }
        }
    }
    
    scan(dir);
    return files;
}

function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const issues = [];
    
    AUTH_PATTERNS.forEach((pattern, index) => {
        lines.forEach((line, lineNum) => {
            if (pattern.test(line)) {
                issues.push({
                    line: lineNum + 1,
                    content: line.trim(),
                    pattern: pattern.toString()
                });
            }
        });
    });
    
    return issues;
}

function getAuthRecommendation(filePath, issues) {
    const fileName = path.basename(filePath);
    const isBackend = filePath.includes('backend');
    
    const recommendations = [];
    
    // Check for problematic patterns
    issues.forEach(issue => {
        if (issue.pattern.includes('auth.requireAuth')) {
            recommendations.push({
                type: 'ERROR',
                message: 'auth.requireAuth() does not exist in current auth.js',
                fix: 'Replace with auth.init() and auth.getUser() check'
            });
        }
        
        if (issue.pattern.includes('localStorage') && fileName === 'auth.js') {
            recommendations.push({
                type: 'WARNING',
                message: 'localStorage used for auth - consider adding server-side validation',
                fix: 'Always validate localStorage data with server on critical pages'
            });
        }
        
        if (issue.pattern.includes('credentials.*include') && !isBackend) {
            recommendations.push({
                type: 'INFO',
                message: 'credentials: include used - ensure CORS is configured',
                fix: 'Verify backend CORS allows credentials from frontend domain'
            });
        }
    });
    
    return recommendations;
}

async function main() {
    console.log('📁 Scanning Frontend Files...');
    const frontendFiles = await findFiles(FRONTEND_DIR, CHECK_EXTENSIONS);
    
    console.log('📁 Scanning Backend Files...');
    const backendFiles = await findFiles(BACKEND_DIR, CHECK_EXTENSIONS);
    
    const allFiles = [...frontendFiles, ...backendFiles];
    
    console.log(`\n📊 Found ${allFiles.length} files to analyze\n`);
    
    const auditReport = {
        totalFiles: allFiles.length,
        filesWithAuth: [],
        issues: [],
        recommendations: []
    };
    
    for (const file of allFiles) {
        const issues = analyzeFile(file);
        
        if (issues.length > 0) {
            const relativePath = path.relative(PROJECT_ROOT, file);
            auditReport.filesWithAuth.push({
                file: relativePath,
                issues: issues.length,
                details: issues
            });
            
            const recommendations = getAuthRecommendation(file, issues);
            if (recommendations.length > 0) {
                auditReport.recommendations.push({
                    file: relativePath,
                    recommendations
                });
            }
        }
    }
    
    // Generate report
    console.log('📋 AUDIT REPORT');
    console.log('='.repeat(80));
    
    auditReport.filesWithAuth.forEach(item => {
        console.log(`\n📄 ${item.file}`);
        console.log(`   Found ${item.issues} auth-related patterns`);
        
        item.details.forEach(detail => {
            console.log(`   • Line ${detail.line}: ${detail.content.substring(0, 80)}...`);
        });
    });
    
    console.log('\n\n🚨 RECOMMENDED FIXES');
    console.log('='.repeat(80));
    
    auditReport.recommendations.forEach(item => {
        console.log(`\n📄 ${item.file}`);
        item.recommendations.forEach(rec => {
            const color = rec.type === 'ERROR' ? '\x1b[31m' : 
                         rec.type === 'WARNING' ? '\x1b[33m' : '\x1b[36m';
            console.log(`${color}${rec.type}:\x1b[0m ${rec.message}`);
            console.log(`   Fix: ${rec.fix}`);
        });
    });
    
    // Generate summary
    console.log('\n\n📈 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total files scanned: ${auditReport.totalFiles}`);
    console.log(`Files with auth patterns: ${auditReport.filesWithAuth.length}`);
    console.log(`Total recommendations: ${auditReport.recommendations.length}`);
    
    // Save report to file
    const reportPath = path.join(PROJECT_ROOT, 'auth-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2));
    console.log(`\n✅ Report saved to: ${reportPath}`);
    
    // Generate fix script
    generateFixScript(auditReport);
}

function generateFixScript(auditReport) {
    const fixScript = `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying Auth Fixes...');

// Fix configurations
const FIXES = [
    ${auditReport.recommendations.map(item => {
        return `{
        file: '${item.file}',
        fixes: ${JSON.stringify(item.recommendations)}
    }`;
    }).join(',\n    ')}
];

async function applyFixes() {
    let fixedCount = 0;
    
    for (const fixItem of FIXES) {
        const filePath = path.join(__dirname, fixItem.file);
        
        if (!fs.existsSync(filePath)) {
            console.log(\`❌ File not found: \${fixItem.file}\`);
            continue;
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        
        fixItem.fixes.forEach(fix => {
            if (fix.type === 'ERROR' && fix.message.includes('auth.requireAuth')) {
                // Replace auth.requireAuth() with auth.init() + check
                content = content.replace(
                    /await\\s+auth\\.requireAuth\\(\\)/g,
                    \`await auth.init();\\n    const user = auth.getUser();\\n    if (!user) {\\n        window.location.href = 'login.html';\\n        return;\\n    }\`
                );
                
                content = content.replace(
                    /auth\\.requireAuth\\(\\)/g,
                    \`auth.init()\`
                );
                fixedCount++;
            }
        });
        
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content);
            console.log(\`✅ Fixed: \${fixItem.file}\`);
        }
    }
    
    console.log(\`\\n🎉 Applied \${fixedCount} fixes\`);
}

applyFixes().catch(console.error);
`;

    const scriptPath = path.join(PROJECT_ROOT, 'fix-auth.js');
    fs.writeFileSync(scriptPath, fixScript);
    console.log(`\n🔧 Fix script generated: ${scriptPath}`);
    console.log('Run: node fix-auth.js');
}

main().catch(console.error);