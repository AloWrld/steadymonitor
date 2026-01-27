// improve-admin.js
const fs = require('fs');
const path = require('path');

const FILE_PATH = './frontend/admin.html';

function improveAdminHTML() {
    console.log('🔧 Improving admin.html...\n');
    
    let content = fs.readFileSync(FILE_PATH, 'utf8');
    let updatesMade = false;
    
    // 1. Add missing responsive media queries (480px breakpoint)
    if (!content.includes('@media (max-width: 480px)')) {
        console.log('   Adding 480px breakpoint...');
        const responsiveUpdate = `
        @media (max-width: 480px) {
            .hero-section {
                padding: 1.5rem 1rem;
            }
            
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
                grid-template-columns: repeat(2, 1fr);
                gap: 0.75rem;
            }
            
            .card {
                padding: 1rem;
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
                align-items: flex-start;
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
            
            .nav-user {
                flex-direction: column;
                gap: 0.5rem;
                align-items: flex-start;
            }
            
            #salesChart {
                height: 250px;
            }
        }`;
        
        // Insert before the closing </style> tag
        content = content.replace(/<\/style>/, `${responsiveUpdate}\n</style>`);
        updatesMade = true;
    }
    
    // 2. Enhance existing 768px breakpoint
    if (content.includes('@media (max-width: 768px)')) {
        console.log('   Enhancing 768px breakpoint...');
        
        const enhancedBreakpoint = `
        @media (max-width: 768px) {
            .menu-toggle {
                display: block;
            }
            
            .main-content.with-sidebar {
                margin-left: 0;
            }
            
            .sidebar {
                transform: translateX(-100%);
                position: fixed;
                top: 0;
                left: 0;
                height: 100vh;
                z-index: 1100;
                transition: transform var(--transition);
                box-shadow: var(--shadow-lg);
            }
            
            .sidebar.active {
                transform: translateX(0);
            }
            
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
            }
            
            .grid.grid-2 {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }
            
            .grid.grid-4 {
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
            }
            
            .page-title {
                flex-direction: column;
                gap: 1rem;
                align-items: stretch;
            }
            
            .btn-group {
                width: 100%;
            }
            
            .card-header {
                flex-direction: column;
                gap: 1rem;
                align-items: flex-start;
            }
            
            .card-header .btn,
            .card-header .form-control {
                width: 100%;
            }
            
            .nav-brand h1 {
                font-size: 1.25rem;
            }
            
            .user-greeting {
                font-size: 0.875rem;
            }
            
            .dropdown-menu {
                position: fixed;
                top: auto;
                bottom: 0;
                left: 0;
                right: 0;
                width: 100%;
                border-radius: 12px 12px 0 0;
                transform: translateY(100%);
                transition: transform 0.3s ease;
            }
            
            .dropdown-menu.active {
                transform: translateY(0);
            }
        }`;
        
        // Replace the existing 768px breakpoint
        const regex = /@media \(max-width: 768px\) \{[\s\S]*?\n\s*\}/;
        content = content.replace(regex, enhancedBreakpoint);
        updatesMade = true;
    }
    
    // 3. Add empty-state styling improvements
    if (content.includes('empty-state') && !content.includes('.empty-state {')) {
        console.log('   Enhancing empty-state styles...');
        
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
        
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            flex-direction: column;
            gap: 1rem;
        }
        
        .loading-overlay span {
            color: var(--text-secondary);
            font-weight: 500;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Hidden utility */
        .hidden {
            display: none !important;
        }
        
        /* Mobile-only and desktop-only utilities */
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
        }`;
        
        content = content.replace(/<\/style>/, `${emptyStateStyles}\n</style>`);
        updatesMade = true;
    }
    
    // 4. Add sidebar overlay for mobile
    if (!content.includes('sidebarOverlay')) {
        console.log('   Adding mobile sidebar overlay...');
        
        // Add sidebar overlay before closing body tag
        const sidebarOverlay = '\n    <!-- Mobile sidebar overlay -->\n    <div class="sidebar-overlay" id="sidebarOverlay"></div>\n';
        content = content.replace(/(\s*)<\/body>/, `$1${sidebarOverlay}$1</body>`);
        updatesMade = true;
    }
    
    // 5. Add sidebar overlay styles
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
            backdrop-filter: blur(2px);
        }
        
        .sidebar-overlay.active {
            display: block;
        }
        
        /* Better dropdown for mobile */
        .dropdown {
            position: relative;
        }
        
        @media (max-width: 768px) {
            .dropdown-menu {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                width: 100%;
                max-height: 70vh;
                overflow-y: auto;
                border-radius: 12px 12px 0 0;
                transform: translateY(100%);
                transition: transform 0.3s ease;
                box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
            }
            
            .dropdown-menu.active {
                transform: translateY(0);
            }
            
            .dropdown-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 999;
                display: none;
            }
            
            .dropdown-backdrop.active {
                display: block;
            }
        }`;
        
        content = content.replace(/<\/style>/, `${sidebarOverlayStyles}\n</style>`);
        updatesMade = true;
    }
    
    // 6. Improve the loading state in activity list
    if (content.includes('Loading activities...')) {
        console.log('   Improving loading state in activity list...');
        
        const improvedLoadingState = `
                            <li class="activity-item" id="loadingActivity">
                                <div class="activity-icon">
                                    <div class="loading"></div>
                                </div>
                                <div class="activity-details">
                                    <div class="activity-title">Loading activities...</div>
                                    <div class="activity-time">Just now</div>
                                </div>
                            </li>`;
        
        content = content.replace(
            /<li class="activity-item">\s*<div class="activity-icon">\s*<i class="fas fa-sync fa-spin"><\/i>\s*<\/div>\s*<div class="activity-details">\s*<div class="activity-title">Loading activities\.\.\.<\/div>\s*<div class="activity-time">Just now<\/div>\s*<\/div>\s*<\/li>/,
            improvedLoadingState
        );
        updatesMade = true;
    }
    
    // 7. Improve the empty state in sales chart
    if (content.includes('Loading sales data...')) {
        console.log('   Improving empty state in sales chart...');
        
        const improvedChartEmptyState = `
                            <div class="empty-state">
                                <i class="fas fa-chart-line"></i>
                                <h4>No Data Available</h4>
                                <p>Sales data will appear here once available</p>
                                <button class="btn btn-sm btn-outline mt-2" id="retryChartBtn">
                                    <i class="fas fa-redo"></i> Retry
                                </button>
                            </div>`;
        
        content = content.replace(
            /<div class="empty-state">\s*<div class="empty-icon">\s*<i class="fas fa-chart-line"><\/i>\s*<\/div>\s*<p>Loading sales data\.\.\.<\/p>\s*<\/div>/,
            improvedChartEmptyState
        );
        updatesMade = true;
    }
    
    // 8. Add mobile JavaScript for sidebar and dropdown
    if (content.includes('<script src="js/admin.js"></script>') && !content.includes('DOMContentLoaded')) {
        console.log('   Adding mobile JavaScript functionality...');
        
        const mobileScript = `
    <script>
        // Mobile menu and dropdown functionality
        document.addEventListener('DOMContentLoaded', function() {
            // Mobile menu toggle
            const menuToggle = document.getElementById('menuToggle');
            const sidebar = document.getElementById('sidebar');
            const sidebarOverlay = document.getElementById('sidebarOverlay');
            
            if (menuToggle && sidebar) {
                menuToggle.addEventListener('click', () => {
                    sidebar.classList.toggle('active');
                    if (sidebarOverlay) {
                        sidebarOverlay.classList.toggle('active');
                    }
                    document.body.classList.toggle('no-scroll');
                });
                
                if (sidebarOverlay) {
                    sidebarOverlay.addEventListener('click', () => {
                        sidebar.classList.remove('active');
                        sidebarOverlay.classList.remove('active');
                        document.body.classList.remove('no-scroll');
                    });
                }
            }
            
            // Mobile dropdown menu
            const userMenu = document.getElementById('userMenu');
            const dropdownMenu = document.getElementById('dropdownMenu');
            
            if (userMenu && dropdownMenu) {
                userMenu.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownMenu.classList.toggle('active');
                    
                    // Add backdrop for mobile
                    if (window.innerWidth <= 768) {
                        let backdrop = document.querySelector('.dropdown-backdrop');
                        if (!backdrop) {
                            backdrop = document.createElement('div');
                            backdrop.className = 'dropdown-backdrop';
                            document.body.appendChild(backdrop);
                        }
                        backdrop.classList.toggle('active');
                        
                        backdrop.addEventListener('click', () => {
                            dropdownMenu.classList.remove('active');
                            backdrop.classList.remove('active');
                        });
                    }
                });
                
                // Close dropdown when clicking elsewhere
                document.addEventListener('click', (e) => {
                    if (!userMenu.contains(e.target) && !dropdownMenu.contains(e.target)) {
                        dropdownMenu.classList.remove('active');
                        const backdrop = document.querySelector('.dropdown-backdrop');
                        if (backdrop) backdrop.classList.remove('active');
                    }
                });
            }
            
            // Logout functionality
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (confirm('Are you sure you want to logout?')) {
                        showLoading(true);
                        try {
                            // Call auth.js logout function
                            if (typeof auth !== 'undefined' && auth.logout) {
                                await auth.logout();
                            }
                            window.location.href = 'login.html';
                        } catch (error) {
                            console.error('Logout error:', error);
                            showLoading(false);
                        }
                    }
                });
            }
            
            // Retry chart button
            const retryChartBtn = document.getElementById('retryChartBtn');
            if (retryChartBtn) {
                retryChartBtn.addEventListener('click', () => {
                    // Reload chart data
                    if (typeof loadChartData === 'function') {
                        loadChartData();
                    }
                });
            }
            
            // Refresh button
            const refreshBtn = document.getElementById('refreshBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    if (typeof loadDashboardData === 'function') {
                        loadDashboardData();
                    }
                });
            }
            
            // View all activity button
            const viewAllActivityBtn = document.getElementById('viewAllActivity');
            if (viewAllActivityBtn) {
                viewAllActivityBtn.addEventListener('click', () => {
                    window.location.href = 'reports.html?tab=activity';
                });
            }
            
            // Chart period change
            const chartPeriod = document.getElementById('chartPeriod');
            if (chartPeriod) {
                chartPeriod.addEventListener('change', () => {
                    if (typeof loadChartData === 'function') {
                        loadChartData();
                    }
                });
            }
            
            // Export button
            const exportBtn = document.getElementById('exportBtn');
            if (exportBtn) {
                exportBtn.addEventListener('click', async () => {
                    showLoading(true);
                    try {
                        // Call export function from admin.js
                        if (typeof exportDashboardData === 'function') {
                            await exportDashboardData();
                        } else {
                            showNotification('Export functionality not available', 'warning');
                        }
                    } catch (error) {
                        console.error('Export error:', error);
                        showNotification('Export failed: ' + error.message, 'error');
                    } finally {
                        showLoading(false);
                    }
                });
            }
            
            // Prevent body scroll when sidebar or dropdown is open
            document.body.classList.remove('no-scroll');
        });
        
        // Show/hide loading overlay
        function showLoading(show) {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.style.display = show ? 'flex' : 'none';
            }
        }
        
        // Show notification (simple implementation)
        function showNotification(message, type = 'info') {
            // Remove existing notifications
            const existing = document.querySelector('.notification-toast');
            if (existing) existing.remove();
            
            const notification = document.createElement('div');
            notification.className = \`notification-toast notification-\${type}\`;
            notification.innerHTML = \`
                <div class="notification-content">
                    <i class="fas \${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                    <span>\${message}</span>
                </div>
                <button class="notification-close">&times;</button>
            \`;
            
            document.body.appendChild(notification);
            
            // Add styles if not present
            if (!document.querySelector('#notification-styles')) {
                const styles = document.createElement('style');
                styles.id = 'notification-styles';
                styles.textContent = \`
                    .notification-toast {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        padding: 1rem 1.5rem;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        min-width: 300px;
                        max-width: 400px;
                        z-index: 9999;
                        animation: slideIn 0.3s ease;
                        border-left: 4px solid var(--primary);
                    }
                    
                    .notification-success {
                        border-left-color: var(--success);
                    }
                    
                    .notification-error {
                        border-left-color: var(--danger);
                    }
                    
                    .notification-warning {
                        border-left-color: var(--warning);
                    }
                    
                    .notification-content {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        flex: 1;
                    }
                    
                    .notification-content i {
                        font-size: 1.25rem;
                    }
                    
                    .notification-success .notification-content i {
                        color: var(--success);
                    }
                    
                    .notification-error .notification-content i {
                        color: var(--danger);
                    }
                    
                    .notification-warning .notification-content i {
                        color: var(--warning);
                    }
                    
                    .notification-close {
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        color: var(--text-muted);
                        cursor: pointer;
                        padding: 0 0.5rem;
                    }
                    
                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    
                    @media (max-width: 768px) {
                        .notification-toast {
                            left: 20px;
                            right: 20px;
                            min-width: auto;
                            max-width: none;
                        }
                    }
                \`;
                document.head.appendChild(styles);
            }
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 5000);
            
            // Close button
            notification.querySelector('.notification-close').addEventListener('click', () => {
                notification.remove();
            });
            
            // Add slideOut animation
            const styleSheet = document.querySelector('#notification-styles');
            if (styleSheet && !styleSheet.textContent.includes('slideOut')) {
                styleSheet.textContent += \`
                    @keyframes slideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                \`;
            }
        }
        
        // Prevent body scroll utility
        const originalStyle = document.body.style.cssText;
        function disableBodyScroll() {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
        }
        
        function enableBodyScroll() {
            document.body.style.cssText = originalStyle;
        }
        
        // Make functions available globally
        window.showLoading = showLoading;
        window.showNotification = showNotification;
    </script>`;
        
        content = content.replace(
            '<script src="js/admin.js"></script>',
            '<script src="js/admin.js"></script>' + mobileScript
        );
        updatesMade = true;
    }
    
    // 9. Add CSS for no-scroll class
    console.log('   Adding no-scroll class for mobile...');
    const noScrollStyles = `
        /* Prevent body scroll when sidebar/dropdown is open */
        body.no-scroll {
            overflow: hidden;
            position: fixed;
            width: 100%;
            height: 100%;
        }
        
        /* Quick actions button improvements for mobile */
        .btn.btn-outline {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1.5rem 0.75rem;
            text-align: center;
            min-height: 100px;
        }
        
        .btn.btn-outline i {
            margin-bottom: 0.5rem;
        }
        
        /* Better stats card spacing */
        .stat-card {
            position: relative;
            overflow: hidden;
        }
        
        .stat-card::after {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 100%;
            height: 200%;
            background: rgba(255,255,255,0.1);
            transform: rotate(30deg);
            transition: transform 0.5s ease;
        }
        
        .stat-card:hover::after {
            transform: rotate(30deg) translateX(100%);
        }`;
    
    content = content.replace(/<\/style>/, `${noScrollStyles}\n</style>`);
    updatesMade = true;
    
    // 10. Add responsive grid improvements
    console.log('   Enhancing grid responsiveness...');
    const gridImprovements = `
        /* Enhanced grid responsiveness */
        @media (max-width: 1024px) {
            .grid.grid-4 {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (max-width: 640px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .grid.grid-4 {
                grid-template-columns: 1fr;
            }
            
            .btn.btn-outline {
                min-height: 80px;
                padding: 1rem 0.5rem;
            }
            
            .btn.btn-outline i {
                font-size: 1.5rem;
            }
        }
        
        /* Better button groups on mobile */
        .btn-group-responsive {
            display: flex;
            flex-direction: row;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        
        @media (max-width: 768px) {
            .btn-group-responsive {
                flex-direction: column;
                width: 100%;
            }
            
            .btn-group-responsive .btn {
                width: 100%;
            }
        }`;
    
    content = content.replace(/<\/style>/, `${gridImprovements}\n</style>`);
    updatesMade = true;
    
    // 11. Improve the page-title for mobile
    if (content.includes('page-title')) {
        console.log('   Improving page-title for mobile...');
        
        // Add mobile-specific styles to page-title
        const pageTitleImprovements = `
        /* Page title improvements for mobile */
        .page-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 1rem;
        }
        
        .page-title h1 {
            flex: 1;
            min-width: 200px;
        }
        
        @media (max-width: 640px) {
            .page-title {
                flex-direction: column;
                align-items: stretch;
                text-align: center;
            }
            
            .page-title h1 {
                font-size: 1.5rem;
                text-align: center;
            }
            
            .page-title .btn-group {
                width: 100%;
                justify-content: center;
            }
        }`;
        
        content = content.replace(/<\/style>/, `${pageTitleImprovements}\n</style>`);
        updatesMade = true;
    }
    
    // Save the updated file
    if (updatesMade) {
        fs.writeFileSync(FILE_PATH, content, 'utf8');
        console.log('\n✅ admin.html has been successfully improved!');
        
        // Display summary of improvements
        console.log('\n📋 Summary of improvements made:');
        console.log('  1. Added comprehensive 480px breakpoint');
        console.log('  2. Enhanced existing 768px breakpoint');
        console.log('  3. Improved empty-state and loading animations');
        console.log('  4. Added mobile sidebar overlay system');
        console.log('  5. Added mobile dropdown with backdrop');
        console.log('  6. Improved loading states in activity list and chart');
        console.log('  7. Added mobile JavaScript functionality');
        console.log('  8. Added notification system');
        console.log('  9. Enhanced grid responsiveness');
        console.log('  10. Improved page-title for mobile');
        console.log('  11. Added better button layouts for mobile');
    } else {
        console.log('\n✅ admin.html already has most improvements!');
    }
}

// Run the improvement
improveAdminHTML();