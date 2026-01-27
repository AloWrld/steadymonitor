// improve-department.js
const fs = require('fs');
const path = require('path');

const FILE_PATH = './frontend/department.html';

function improveDepartmentHTML() {
    console.log('🔧 Improving department.html...\n');
    
    let content = fs.readFileSync(FILE_PATH, 'utf8');
    let updatesMade = false;
    
    // 1. Add missing responsive media queries
    if (!content.includes('@media (max-width: 480px)')) {
        console.log('   Adding 480px breakpoint...');
        const responsiveUpdate = `
        @media (max-width: 480px) {
            .hero-section {
                padding: 2rem 1rem;
            }
            
            .hero-title {
                font-size: 1.75rem;
            }
            
            .hero-subtitle {
                font-size: 0.9rem;
                padding: 0 0.5rem;
            }
            
            .department-badge {
                font-size: 0.9rem;
                padding: 0.375rem 1rem;
            }
            
            .quick-actions {
                flex-direction: column;
                align-items: stretch;
            }
            
            .quick-actions .btn {
                width: 100%;
                margin-bottom: 0.5rem;
            }
            
            .stats-overview {
                grid-template-columns: 1fr;
                gap: 0.75rem;
            }
            
            .module-grid {
                gap: 1rem;
            }
            
            .grid.grid-2 {
                grid-template-columns: 1fr;
            }
            
            .table-container {
                margin: 0 -1rem;
                border-radius: 0;
                border-left: none;
                border-right: none;
            }
        }`;
        
        // Insert before the closing </style> tag
        content = content.replace(/<\/style>/, `${responsiveUpdate}\n</style>`);
        updatesMade = true;
    }
    
    // 2. Add table-responsive wrapper to the recent activity table
    if (content.includes('<table class="table">') && !content.includes('table-responsive')) {
        console.log('   Adding table-responsive wrapper...');
        
        // Find the table and wrap it
        const tablePattern = /<div class="table-container">\s*<table class="table">/g;
        if (tablePattern.test(content)) {
            content = content.replace(
                /<div class="table-container">\s*<table class="table">/,
                '<div class="table-container">\n                        <div class="table-responsive">\n                            <table class="table">'
            );
            
            // Add closing div for table-responsive
            content = content.replace(
                /<\/tbody>\s*<\/table>\s*<\/div>/,
                '</tbody>\n                            </table>\n                        </div>\n                    </div>'
            );
            updatesMade = true;
        }
    }
    
    // 3. Add empty-state styling (for loading/empty table states)
    if (!content.includes('.empty-state')) {
        console.log('   Adding empty-state styles...');
        const emptyStateStyles = `
        /* Empty states */
        .empty-state {
            text-align: center;
            padding: 3rem 1rem;
            color: var(--text-muted);
        }
        
        .empty-state i {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.5;
        }
        
        .empty-state h3 {
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }
        
        /* Loading states */
        .loading {
            display: inline-block;
            width: 1rem;
            height: 1rem;
            border: 2px solid var(--border);
            border-radius: 50%;
            border-top-color: var(--primary);
            animation: spin 1s ease-in-out infinite;
        }
        
        .loading-placeholder {
            height: 20px;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            border-radius: 4px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        
        /* Hidden utility */
        .hidden {
            display: none !important;
        }`;
        
        content = content.replace(/<\/style>/, `${emptyStateStyles}\n</style>`);
        updatesMade = true;
    }
    
    // 4. Improve existing 768px breakpoint for better mobile experience
    if (content.includes('@media (max-width: 768px)')) {
        console.log('   Enhancing 768px breakpoint...');
        
        const enhancedBreakpoint = `
        @media (max-width: 768px) {
            .hero-title {
                font-size: 2rem;
            }
            
            .hero-subtitle {
                font-size: 1rem;
                padding: 0 1rem;
            }
            
            .module-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }
            
            .stats-overview {
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
            }
            
            .module-card {
                padding: 1.5rem;
            }
            
            .module-icon {
                width: 60px;
                height: 60px;
                font-size: 1.5rem;
            }
            
            .quick-actions {
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .quick-actions .btn {
                flex: 1;
                min-width: 140px;
                text-align: center;
            }
            
            .card-header {
                flex-direction: column;
                gap: 1rem;
                align-items: flex-start;
            }
            
            .card-header .btn {
                align-self: flex-start;
            }
            
            .page-title {
                font-size: 1.5rem;
                text-align: center;
            }
        }`;
        
        // Replace the existing 768px breakpoint
        const regex = /@media \(max-width: 768px\) \{[\s\S]*?\n\s*\}/;
        content = content.replace(regex, enhancedBreakpoint);
        updatesMade = true;
    }
    
    // 5. Add better table styles for mobile
    if (content.includes('.table {')) {
        console.log('   Enhancing table styles for mobile...');
        
        const tableImprovements = `
        /* Table mobile improvements */
        .table th, .table td {
            padding: 0.75rem;
        }
        
        @media (max-width: 768px) {
            .table th, .table td {
                padding: 0.5rem;
                font-size: 0.875rem;
            }
            
            .table th:nth-child(3),
            .table td:nth-child(3) {
                max-width: 120px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        }
        
        @media (max-width: 480px) {
            .table th, .table td {
                padding: 0.375rem;
                font-size: 0.8125rem;
            }
            
            .table th:nth-child(1),
            .table td:nth-child(1) {
                min-width: 70px;
            }
            
            .table th:nth-child(5),
            .table td:nth-child(5) {
                min-width: 90px;
            }
        }`;
        
        content = content.replace(/<\/style>/, `${tableImprovements}\n</style>`);
        updatesMade = true;
    }
    
    // 6. Add mobile menu toggle functionality if not present
    if (!content.includes('sidebarOverlay')) {
        console.log('   Adding mobile sidebar overlay...');
        
        // Add sidebar overlay before closing body tag
        const sidebarOverlay = '\n    <!-- Mobile sidebar overlay -->\n    <div class="sidebar-overlay" id="sidebarOverlay"></div>\n';
        content = content.replace(/(\s*)<\/body>/, `$1${sidebarOverlay}$1</body>`);
        updatesMade = true;
    }
    
    // 7. Add mobile-specific JavaScript for sidebar
    if (content.includes('<script src="js/department.js"></script>') && !content.includes('menuToggle')) {
        console.log('   Adding mobile menu JavaScript...');
        
        const mobileScript = `
    <script>
        // Mobile menu toggle
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
            
            // Dropdown menu toggle
            const userMenu = document.getElementById('userMenu');
            const dropdownMenu = document.getElementById('dropdownMenu');
            
            if (userMenu && dropdownMenu) {
                userMenu.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownMenu.style.display = 
                        dropdownMenu.style.display === 'block' ? 'none' : 'block';
                });
                
                // Close dropdown when clicking elsewhere
                document.addEventListener('click', () => {
                    dropdownMenu.style.display = 'none';
                });
            }
            
            // Logout functionality
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (confirm('Are you sure you want to logout?')) {
                        // Call auth.js logout function
                        if (typeof auth !== 'undefined' && auth.logout) {
                            await auth.logout();
                        }
                        window.location.href = 'login.html';
                    }
                });
            }
        });
    </script>`;
        
        content = content.replace(
            '<script src="js/department.js"></script>',
            '<script src="js/department.js"></script>' + mobileScript
        );
        updatesMade = true;
    }
    
    // 8. Add better loading state to the table
    if (content.includes('Loading recent activity...')) {
        console.log('   Improving loading state in table...');
        
        const improvedLoadingState = `
                                <tr id="loadingActivity">
                                    <td colspan="5" class="text-center">
                                        <div class="empty-state">
                                            <div class="loading"></div>
                                            <p class="mt-2">Loading recent activity...</p>
                                        </div>
                                    </td>
                                </tr>`;
        
        content = content.replace(
            /<tr>\s*<td colspan="5" class="text-center">\s*<div class="loading"><\/div>\s*Loading recent activity\.\.\.\s*<\/td>\s*<\/tr>/,
            improvedLoadingState
        );
        updatesMade = true;
    }
    
    // 9. Add CSS for sidebar overlay if missing from base.css reference
    if (!content.includes('.sidebar-overlay')) {
        console.log('   Adding sidebar overlay styles...');
        
        const sidebarOverlayStyles = `
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
            .sidebar {
                position: fixed;
                left: 0;
                top: 0;
                height: 100vh;
                transform: translateX(-100%);
                transition: transform var(--transition);
                z-index: 1100;
                box-shadow: var(--shadow-lg);
            }
            
            .sidebar.active {
                transform: translateX(0);
            }
            
            .menu-toggle {
                display: flex;
                align-items: center;
                justify-content: center;
            }
        }`;
        
        content = content.replace(/<\/style>/, `${sidebarOverlayStyles}\n</style>`);
        updatesMade = true;
    }
    
    // 10. Add utility classes for better responsive design
    console.log('   Adding responsive utility classes...');
    const utilityClasses = `
        /* Responsive utility classes */
        .mobile-only {
            display: none !important;
        }
        
        .desktop-only {
            display: block !important;
        }
        
        @media (max-width: 768px) {
            .mobile-only {
                display: block !important;
            }
            
            .desktop-only {
                display: none !important;
            }
        }
        
        /* Better button spacing on mobile */
        .btn-group-mobile {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        @media (min-width: 769px) {
            .btn-group-mobile {
                flex-direction: row;
            }
        }`;
    
    content = content.replace(/<\/style>/, `${utilityClasses}\n</style>`);
    updatesMade = true;
    
    // Save the updated file
    if (updatesMade) {
        fs.writeFileSync(FILE_PATH, content, 'utf8');
        console.log('\n✅ department.html has been successfully improved!');
        
        // Display summary of improvements
        console.log('\n📋 Summary of improvements made:');
        console.log('  1. Added 480px breakpoint for extra-small devices');
        console.log('  2. Added table-responsive wrapper for better mobile scrolling');
        console.log('  3. Added empty-state and loading animations');
        console.log('  4. Enhanced existing 768px breakpoint');
        console.log('  5. Improved table styles for mobile');
        console.log('  6. Added mobile sidebar overlay');
        console.log('  7. Added mobile menu JavaScript functionality');
        console.log('  8. Improved loading state in activity table');
        console.log('  9. Added sidebar overlay styles');
        console.log('  10. Added responsive utility classes');
    } else {
        console.log('\n✅ department.html already has most improvements!');
    }
}

// Run the improvement
improveDepartmentHTML();