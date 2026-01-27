// check-pos-js.js
const fs = require('fs');
const path = require('path');

const JS_FILE_PATH = './frontend/js/pos.js';

function checkPOSJS() {
    console.log('\n🔍 Checking pos.js for issues...\n');
    
    if (!fs.existsSync(JS_FILE_PATH)) {
        console.log('❌ pos.js not found');
        return;
    }
    
    const content = fs.readFileSync(JS_FILE_PATH, 'utf8');
    
    // Check for issues
    const issues = [];
    
    // 1. Check for duplicate function definitions
    if ((content.match(/function loadProducts/g) || []).length > 1) {
        issues.push('Duplicate loadProducts function');
    }
    
    if ((content.match(/function displayProducts/g) || []).length > 1) {
        issues.push('Duplicate displayProducts function');
    }
    
    // 2. Check for missing debounce function
    if (!content.includes('debounce') && content.includes('addEventListener') && content.includes('resize')) {
        issues.push('Missing debounce for resize events');
    }
    
    // 3. Check for proper error handling
    if (!content.includes('catch') || !content.includes('error')) {
        issues.push('Insufficient error handling');
    }
    
    if (issues.length > 0) {
        console.log('⚠️  Issues found in pos.js:');
        issues.forEach(issue => console.log(`   ❌ ${issue}`));
        
        // Add debounce function if missing
        if (issues.includes('Missing debounce for resize events')) {
            console.log('\n   Adding debounce function...');
            const debounceFunction = `

/**
 * Debounce function for resize events
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}`;

            // Add before window event listeners
            if (content.includes('window.addEventListener')) {
                const newContent = content.replace(
                    'window.addEventListener',
                    debounceFunction + '\n\nwindow.addEventListener'
                );
                fs.writeFileSync(JS_FILE_PATH, newContent, 'utf8');
                console.log('   ✅ Added debounce function');
            }
        }
    } else {
        console.log('✅ pos.js looks good');
    }
}

// Run the check
checkPOSJS();