// add-debounce-to-admin.js
const fs = require('fs');
const path = require('path');

const JS_FILE_PATH = './frontend/js/admin.js';

function addDebounceFunction() {
    console.log('🔧 Adding debounce function to admin.js...\n');
    
    if (!fs.existsSync(JS_FILE_PATH)) {
        console.log('❌ admin.js not found');
        return;
    }
    
    let content = fs.readFileSync(JS_FILE_PATH, 'utf8');
    
    // Check if debounce function already exists
    if (content.includes('function debounce(') || content.includes('debounce(func,')) {
        console.log('✅ debounce function already exists in admin.js');
        return;
    }
    
    // Add debounce function before the end of the file
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

    // Add the function before any existing window event listeners or at the end
    if (content.includes('window.addEventListener')) {
        // Insert before window event listeners
        const insertPosition = content.indexOf('window.addEventListener');
        content = content.slice(0, insertPosition) + debounceFunction + '\n\n' + content.slice(insertPosition);
    } else {
        // Add at the end before the last closing brace or semicolon
        content = content.trim();
        if (content.endsWith('}')) {
            content = content.slice(0, -1) + debounceFunction + '\n}';
        } else {
            content += debounceFunction;
        }
    }
    
    fs.writeFileSync(JS_FILE_PATH, content, 'utf8');
    console.log('✅ Added debounce function to admin.js');
    
    // Verify it was added
    const updatedContent = fs.readFileSync(JS_FILE_PATH, 'utf8');
    if (updatedContent.includes('function debounce(')) {
        console.log('✅ Verified: debounce function successfully added');
    } else {
        console.log('❌ Failed to add debounce function');
    }
}

// Run the function
addDebounceFunction();