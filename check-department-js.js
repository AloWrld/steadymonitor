// check-department-js.js
const fs = require('fs');
const path = require('path');

const JS_FILE_PATH = './frontend/js/department.js';

function checkDepartmentJS() {
    console.log('\n🔍 Checking department.js for improvements...\n');
    
    if (!fs.existsSync(JS_FILE_PATH)) {
        console.log('❌ department.js not found. Creating basic template...');
        
        const basicJS = `/**
 * Department Hub Module for STEADYMONITOR
 * Central hub for department operations
 */

// DOM Elements
let departmentStats, recentActivityTable, departmentBadge, departmentName;

/**
 * Initialize module
 */
async function init() {
    // Check authentication
    const auth = await authAPI.checkAuth();
    if (!auth.success) {
        window.location.href = '/login.html';
        return;
    }

    // Update user info
    updateUserInfo();
    
    // Cache DOM elements
    cacheElements();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    await loadDepartmentData();
}

/**
 * Update user information
 */
function updateUserInfo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const displayName = user.displayName || user.username || 'User';
    const department = user.department || 'General';
    
    document.getElementById('greeting').textContent = \`Good \${getTimeGreeting()}, \${displayName}\`;
    document.getElementById('userName').textContent = displayName;
    document.getElementById('departmentName').textContent = department;
    document.getElementById('departmentBadge').innerHTML = \`
        <i class="fas fa-building"></i>
        \${department} Department
    \`;
}

/**
 * Get time-based greeting
 */
function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
}

/**
 * Cache DOM elements
 */
function cacheElements() {
    departmentStats = document.getElementById('departmentStats');
    recentActivityTable = document.getElementById('recentActivityTable');
    departmentBadge = document.getElementById('departmentBadge');
    departmentName = document.getElementById('departmentName');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Refresh stats button
    document.getElementById('refreshStats')?.addEventListener('click', async () => {
        await loadDepartmentData();
    });
    
    // View all activity button
    document.getElementById('viewAllActivity')?.addEventListener('click', () => {
        window.location.href = 'reports.html';
    });
}

/**
 * Load department data
 */
async function loadDepartmentData() {
    try {
        showLoading(true);
        
        // Get department stats
        const statsResponse = await apiGet(API_ENDPOINTS.DEPARTMENT_STATS);
        
        if (statsResponse.success) {
            updateDepartmentStats(statsResponse);
        }
        
        // Get recent activity
        const activityResponse = await apiGet(API_ENDPOINTS.DEPARTMENT_ACTIVITY);
        
        if (activityResponse.success) {
            updateRecentActivity(activityResponse);
        }
        
    } catch (error) {
        console.error('Failed to load department data:', error);
        showNotification('Failed to load department data', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Update department stats
 */
function updateDepartmentStats(data) {
    const stats = data.stats || {};
    
    // Update stat boxes
    document.getElementById('todaySales').textContent = 
        formatCurrency(stats.today_sales || 0);
    
    document.getElementById('pendingAllocations').textContent = 
        stats.pending_allocations || 0;
    
    document.getElementById('lowStockItems').textContent = 
        stats.low_stock_items || 0;
    
    document.getElementById('completedTransactions').textContent = 
        stats.completed_transactions || 0;
}

/**
 * Update recent activity table
 */
function updateRecentActivity(data) {
    const activities = data.activities || [];
    const tableBody = document.getElementById('recentActivityTable');
    
    if (activities.length === 0) {
        tableBody.innerHTML = \`
            <tr>
                <td colspan="5" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-history fa-2x"></i>
                        <p>No recent activity</p>
                    </div>
                </td>
            </tr>
        \`;
        return;
    }
    
    const rows = activities.map(activity => \`
        <tr>
            <td>
                <div>\${formatTime(activity.timestamp)}</div>
                <small class="text-muted">\${formatDate(activity.timestamp)}</small>
            </td>
            <td>
                <div>\${activity.activity_type || 'Unknown'}</div>
                <small class="text-muted">\${activity.description || ''}</small>
            </td>
            <td>
                \${activity.learner_name ? \`
                    <div>\${activity.learner_name}</div>
                    <small class="text-muted">\${activity.learner_id || ''}</small>
                \` : activity.reference || 'N/A'}
            </td>
            <td class="\${activity.amount > 0 ? 'text-success' : 'text-danger'}">
                \${activity.amount ? formatCurrency(activity.amount) : 'N/A'}
            </td>
            <td>
                <span class="badge \${getStatusBadgeClass(activity.status)}">
                    \${activity.status || 'unknown'}
                </span>
            </td>
        </tr>
    \`).join('');
    
    tableBody.innerHTML = rows;
}

/**
 * Get CSS class for status badge
 */
function getStatusBadgeClass(status) {
    switch(status?.toLowerCase()) {
        case 'completed':
        case 'success':
            return 'badge-success';
        case 'pending':
            return 'badge-warning';
        case 'failed':
        case 'error':
            return 'badge-danger';
        default:
            return 'badge-secondary';
    }
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // You can implement your own notification system here
    console.log(\`[\${type.toUpperCase()}] \${message}\`);
    alert(message); // Simple alert for now
}

/**
 * Format currency helper
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2
    }).format(amount || 0);
}

/**
 * Format date helper
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format time helper
 */
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
`;
        
        fs.writeFileSync(JS_FILE_PATH, basicJS, 'utf8');
        console.log('✅ Created department.js with basic functionality');
    } else {
        console.log('✅ department.js exists. Please check if it needs mobile/responsive improvements.');
        const jsContent = fs.readFileSync(JS_FILE_PATH, 'utf8');
        
        // Check for mobile/responsive features
        const checks = {
            'Loading states': jsContent.includes('showLoading') || jsContent.includes('loadingOverlay'),
            'Empty states': jsContent.includes('empty-state') || jsContent.includes('No recent activity'),
            'Mobile event handlers': jsContent.includes('addEventListener') && jsContent.includes('click'),
            'Error handling': jsContent.includes('catch') && jsContent.includes('error'),
            'Format helpers': jsContent.includes('formatCurrency') || jsContent.includes('formatDate')
        };
        
        console.log('\n📊 department.js status:');
        Object.entries(checks).forEach(([feature, exists]) => {
            console.log(`   ${exists ? '✅' : '❌'} ${feature}`);
        });
    }
}

// Run the check
checkDepartmentJS();