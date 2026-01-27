// audit-responsive.js
const fs = require('fs');
const path = require('path');

const PAYMENTS_HTML = 'payments.html';
const BASE_CSS = 'css/base.css';

// Key improvements to check for
const IMPROVEMENTS = {
    responsive: [
        '@media (max-width: 768px)',
        '@media (max-width: 480px)',
        'table-responsive',
        'grid-template-columns: repeat(auto-fit',
        'flex-direction: column',
        '.hidden'
    ],
    structure: [
        'empty-state',
        'modal-overlay',
        'tab-btn',
        'tab-pane',
        'loading',
        'stats-grid'
    ]
};

function checkFile(filePath, category) {
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${filePath}`);
        return { missing: IMPROVEMENTS[category], score: 0 };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const missing = [];
    
    IMPROVEMENTS[category].forEach(improvement => {
        if (!content.includes(improvement)) {
            missing.push(improvement);
        }
    });
    
    const score = ((IMPROVEMENTS[category].length - missing.length) / IMPROVEMENTS[category].length) * 100;
    
    return { missing, score };
}

function auditProject() {
    console.log('🔍 Auditing project for responsiveness improvements...\n');
    
    // Check all HTML files in frontend directory
    const frontendDir = './frontend';
    const htmlFiles = fs.readdirSync(frontendDir)
        .filter(file => file.endsWith('.html') && file !== 'login.html');
    
    htmlFiles.forEach(file => {
        const filePath = path.join(frontendDir, file);
        console.log(`\n📄 ${file}:`);
        
        const responsiveCheck = checkFile(filePath, 'responsive');
        const structureCheck = checkFile(filePath, 'structure');
        
        console.log(`   Responsiveness Score: ${responsiveCheck.score.toFixed(1)}%`);
        if (responsiveCheck.missing.length > 0) {
            console.log(`   Missing responsive features: ${responsiveCheck.missing.length}`);
        }
        
        console.log(`   Structure Score: ${structureCheck.score.toFixed(1)}%`);
        if (structureCheck.missing.length > 0) {
            console.log(`   Missing structural features: ${structureCheck.missing.length}`);
        }
        
        if (responsiveCheck.score < 80 || structureCheck.score < 80) {
            console.log(`   ⚠️  Needs updates`);
        } else {
            console.log(`   ✅ Good`);
        }
    });
}

auditProject();