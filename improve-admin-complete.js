// improve-admin-complete.js
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting comprehensive admin improvements...\n');

// Step 1: Add debounce to admin.js
console.log('📝 Step 1: Checking admin.js for debounce function...');
const JS_FILE_PATH = './frontend/js/admin.js';

if (fs.existsSync(JS_FILE_PATH)) {
    let jsContent = fs.readFileSync(JS_FILE_PATH, 'utf8');
    
    if (!jsContent.includes('function debounce(') && !jsContent.includes('debounce(func,')) {
        console.log('   Adding debounce function...');
        
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

        // Try to add it in a logical place
        if (jsContent.includes('window.addEventListener')) {
            const insertPosition = jsContent.indexOf('window.addEventListener');
            jsContent = jsContent.slice(0, insertPosition) + debounceFunction + '\n\n' + jsContent.slice(insertPosition);
        } else {
            jsContent = jsContent.trim() + debounceFunction;
        }
        
        fs.writeFileSync(JS_FILE_PATH, jsContent, 'utf8');
        console.log('   ✅ Added debounce function to admin.js');
    } else {
        console.log('   ✅ debounce function already exists');
    }
} else {
    console.log('   ⚠️  admin.js not found, skipping...');
}

// Step 2: Improve admin.html
console.log('\n📝 Step 2: Improving admin.html...');
const HTML_FILE_PATH = './frontend/admin.html';

if (fs.existsSync(HTML_FILE_PATH)) {
    let htmlContent = fs.readFileSync(HTML_FILE_PATH, 'utf8');
    let htmlUpdated = false;
    
    // Check and add 480px breakpoint
    if (!htmlContent.includes('@media (max-width: 480px)')) {
        console.log('   Adding 480px breakpoint...');
        const mobileStyles = `
        @media (max-width: 480px) {
            .stats-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }
            
            .stat-card {
                padding: 1.25rem;
            }
            
            .stat-value {
                font-size: 2rem;
            }
            
            .grid.grid-2 {
                grid-template-columns: 1fr;
                gap: 1rem;
            }
            
            .grid.grid-4 {
                grid-template-columns: 1fr;
                gap: 0.75rem;
            }
            
            .card-header {
                flex-direction: column;
                gap: 0.75rem;
                align-items: flex-start;
            }
            
            .card-header .form-control,
            .card-header .btn {
                width: 100%;
            }
            
            .page-title {
                flex-direction: column;
                gap: 1rem;
                align-items: stretch;
            }
            
            .btn-group {
                flex-direction: column;
                width: 100%;
            }
            
            .btn-group .btn {
                width: 100%;
                margin-bottom: 0.5rem;
            }
            
            .activity-item {
                padding: 0.75rem 0;
            }
            
            .activity-icon {
                width: 32px;
                height: 32px;
                font-size: 0.875rem;
                margin-right: 0.75rem;
            }
            
            .activity-title {
                font-size: 0.875rem;
            }
            
            .activity-time {
                font-size: 0.75rem;
            }
            
            #salesChart {
                height: 250px;
            }
        }`;
        
        htmlContent = htmlContent.replace(/<\/style>/, `${mobileStyles}\n</style>`);
        htmlUpdated = true;
    }
    
    // Add sidebar overlay if missing
    if (!htmlContent.includes('sidebarOverlay')) {
        console.log('   Adding sidebar overlay...');
        const sidebarOverlay = '\n    <!-- Mobile sidebar overlay -->\n    <div class="sidebar-overlay" id="sidebarOverlay"></div>\n';
        htmlContent = htmlContent.replace(/(\s*)<\/body>/, `$1${sidebarOverlay}$1</body>`);
        htmlUpdated = true;
    }
    
    // Add sidebar overlay styles
    if (!htmlContent.includes('.sidebar-overlay')) {
        console.log('   Adding sidebar overlay styles...');
        const overlayStyles = `
        /* Sidebar overlay for mobile */
        .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1090;
            display: none;
        }
        
        .sidebar-overlay.active {
            display: block;
        }
        
        @media (max-width: 768px) {
            .sidebar-overlay.active {
                display: block;
            }
        }`;
        
        htmlContent = htmlContent.replace(/<\/style>/, `${overlayStyles}\n</style>`);
        htmlUpdated = true;
    }
    
    // Add empty-state styles if missing
    if (!htmlContent.includes('.empty-state {')) {
        console.log('   Adding empty-state styles...');
        const emptyStateStyles = `
        /* Empty states */
        .empty-state {
            text-align: center;
            padding: 2rem 1rem;
            color: var(--text-muted);
        }
        
        .empty-state i {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            opacity: 0.3;
        }
        
        .empty-state h4 {
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }
        
        /* Hidden utility */
        .hidden {
            display: none !important;
        }`;
        
        htmlContent = htmlContent.replace(/<\/style>/, `${emptyStateStyles}\n</style>`);
        htmlUpdated = true;
    }
    
    // Add mobile JavaScript if missing
    if (!htmlContent.includes('menuToggle.addEventListener')) {
        console.log('   Adding mobile JavaScript...');
        const mobileJS = `
    <script>
        // Mobile menu functionality
        document.addEventListener('DOMContentLoaded', function() {
            const menuToggle = document.getElementById('menuToggle');
            const sidebar = document.getElementById('sidebar');
            const sidebarOverlay = document.getElementById('sidebarOverlay');
            
            if (menuToggle && sidebar) {
                menuToggle.addEventListener('click', () => {
                    sidebar.classList.toggle('active');
                    if (sidebarOverlay) {
                        sidebarOverlay.classList.toggle('active');
                    }
                });
                
                if (sidebarOverlay) {
                    sidebarOverlay.addEventListener('click', () => {
                        sidebar.classList.remove('active');
                        sidebarOverlay.classList.remove('active');
                    });
                }
            }
            
            // Dropdown menu for mobile
            const userMenu = document.getElementById('userMenu');
            const dropdownMenu = document.getElementById('dropdownMenu');
            
            if (userMenu && dropdownMenu) {
                userMenu.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.innerWidth <= 768) {
                        dropdownMenu.classList.toggle('active');
                    } else {
                        dropdownMenu.style.display = 
                            dropdownMenu.style.display === 'block' ? 'none' : 'block';
                    }
                });
                
                document.addEventListener('click', (e) => {
                    if (!userMenu.contains(e.target) && !dropdownMenu.contains(e.target)) {
                        if (window.innerWidth <= 768) {
                            dropdownMenu.classList.remove('active');
                        } else {
                            dropdownMenu.style.display = 'none';
                        }
                    }
                });
            }
        });
    </script>`;
        
        // Insert before the closing body tag
        if (htmlContent.includes('<script src="js/admin.js"></script>')) {
            htmlContent = htmlContent.replace(
                '<script src="js/admin.js"></script>',
                '<script src="js/admin.js"></script>' + mobileJS
            );
        }
        htmlUpdated = true;
    }
    
    if (htmlUpdated) {
        fs.writeFileSync(HTML_FILE_PATH, htmlContent, 'utf8');
        console.log('   ✅ admin.html updated successfully');
    } else {
        console.log('   ✅ admin.html already has improvements');
    }
} else {
    console.log('   ❌ admin.html not found');
}

console.log('\n✨ Admin improvements completed!');
console.log('\n📋 Next steps:');
console.log('   1. Test admin.html on mobile devices');
console.log('   2. Verify sidebar menu works on mobile');
console.log('   3. Check dropdown functionality');
console.log('   4. Ensure charts are responsive');