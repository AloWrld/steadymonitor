// check-admin-js.js
const fs = require('fs');
const path = require('path');

const JS_FILE_PATH = './frontend/js/admin.js';

function checkAdminJS() {
    console.log('\n🔍 Checking admin.js for improvements...\n');
    
    if (!fs.existsSync(JS_FILE_PATH)) {
        console.log('❌ admin.js not found. Creating template with mobile/responsive features...');
        
        const adminJS = `/**
 * Admin Dashboard Module for STEADYMONITOR
 */

// Global variables
let dashboardData = null;
let salesChart = null;

/**
 * Initialize dashboard
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
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    await loadDashboardData();
    
    // Initialize chart (if using Chart.js)
    initializeChart();
}

/**
 * Update user information
 */
function updateUserInfo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const displayName = user.displayName || user.username || 'Admin';
    
    document.getElementById('greeting').textContent = \`Good \${getTimeGreeting()}, \${displayName}\`;
    document.getElementById('userName').textContent = displayName;
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
 * Setup event listeners
 */
function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
        await loadDashboardData();
    });
    
    // Export button
    document.getElementById('exportBtn')?.addEventListener('click', exportDashboardData);
    
    // View all activity
    document.getElementById('viewAllActivity')?.addEventListener('click', () => {
        window.location.href = 'reports.html';
    });
    
    // Chart period change
    document.getElementById('chartPeriod')?.addEventListener('change', loadChartData);
    
    // Retry chart button (if exists)
    document.getElementById('retryChartBtn')?.addEventListener('click', loadChartData);
    
    // Window resize - redraw chart for responsiveness
    window.addEventListener('resize', debounce(() => {
        if (salesChart) {
            salesChart.resize();
        }
    }, 250));
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    try {
        showLoading(true);
        
        // Load stats
        const statsResponse = await apiGet(API_ENDPOINTS.DASHBOARD_STATS);
        
        if (statsResponse.success) {
            updateStats(statsResponse);
        }
        
        // Load recent activity
        const activityResponse = await apiGet(API_ENDPOINTS.DASHBOARD_ACTIVITY);
        
        if (activityResponse.success) {
            updateRecentActivity(activityResponse);
        }
        
        // Load chart data
        await loadChartData();
        
        dashboardData = {
            stats: statsResponse,
            activity: activityResponse
        };
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showNotification('Failed to load dashboard data', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Update statistics
 */
function updateStats(data) {
    const stats = data.stats || {};
    
    document.getElementById('totalSales').textContent = 
        formatCurrency(stats.total_sales_today || 0);
    
    document.getElementById('totalCustomers').textContent = 
        stats.active_customers || 0;
    
    document.getElementById('lowStock').textContent = 
        stats.low_stock_items || 0;
    
    document.getElementById('pendingPayments').textContent = 
        formatCurrency(stats.pending_payments || 0);
}

/**
 * Update recent activity
 */
function updateRecentActivity(data) {
    const activities = data.activities || [];
    const activityList = document.getElementById('activityList');
    
    // Remove loading indicator
    const loadingActivity = document.getElementById('loadingActivity');
    if (loadingActivity) {
        loadingActivity.remove();
    }
    
    if (activities.length === 0) {
        activityList.innerHTML = \`
            <li class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-inbox"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">No recent activity</div>
                    <div class="activity-time">Check back later</div>
                </div>
            </li>
        \`;
        return;
    }
    
    const activityItems = activities.slice(0, 5).map(activity => \`
        <li class="activity-item">
            <div class="activity-icon" style="background: \${getActivityColor(activity.type)}; color: white;">
                <i class="fas \${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-details">
                <div class="activity-title">\${activity.description || 'Unknown activity'}</div>
                <div class="activity-time">\${formatTimeAgo(activity.timestamp)}</div>
            </div>
        </li>
    \`).join('');
    
    activityList.innerHTML = activityItems;
}

/**
 * Get activity icon based on type
 */
function getActivityIcon(type) {
    const icons = {
        'sale': 'fa-shopping-cart',
        'payment': 'fa-credit-card',
        'allocation': 'fa-graduation-cap',
        'inventory': 'fa-boxes',
        'customer': 'fa-user-plus',
        'default': 'fa-bell'
    };
    return icons[type] || icons.default;
}

/**
 * Get activity color based on type
 */
function getActivityColor(type) {
    const colors = {
        'sale': '#4CAF50',
        'payment': '#2196F3',
        'allocation': '#FF9800',
        'inventory': '#9C27B0',
        'customer': '#00BCD4',
        'default': '#607D8B'
    };
    return colors[type] || colors.default;
}

/**
 * Load chart data
 */
async function loadChartData() {
    try {
        const period = document.getElementById('chartPeriod')?.value || 'today';
        const response = await apiGet(\`\${API_ENDPOINTS.DASHBOARD_CHART}?period=\${period}\`);
        
        if (response.success && response.data) {
            renderChart(response.data);
            
            // Hide empty state if shown
            const emptyState = document.querySelector('#salesChart .empty-state');
            if (emptyState) {
                emptyState.classList.add('hidden');
            }
        } else {
            // Show empty state
            const emptyState = document.querySelector('#salesChart .empty-state');
            if (emptyState) {
                emptyState.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Failed to load chart data:', error);
        showNotification('Failed to load chart data', 'error');
        
        // Show empty state
        const emptyState = document.querySelector('#salesChart .empty-state');
        if (emptyState) {
            emptyState.classList.remove('hidden');
        }
    }
}

/**
 * Render sales chart
 */
function renderChart(data) {
    const ctx = document.createElement('canvas');
    const container = document.getElementById('salesChart');
    
    // Clear existing chart
    container.innerHTML = '';
    container.appendChild(ctx);
    
    if (salesChart) {
        salesChart.destroy();
    }
    
    // Initialize Chart.js if available
    if (typeof Chart !== 'undefined') {
        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Sales (KES)',
                    data: data.values || [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'KES ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    } else {
        // Fallback to simple HTML chart
        renderSimpleChart(data);
    }
}

/**
 * Simple HTML chart fallback
 */
function renderSimpleChart(data) {
    const container = document.getElementById('salesChart');
    const maxValue = Math.max(...(data.values || [0]));
    
    const bars = (data.values || []).map((value, index) => {
        const height = maxValue > 0 ? (value / maxValue * 100) : 0;
        return \`
            <div class="chart-bar" style="height: \${height}%;" title="\${data.labels?.[index] || ''}: \${formatCurrency(value)}">
                <div class="chart-bar-value">\${formatCurrencyShort(value)}</div>
            </div>
        \`;
    }).join('');
    
    container.innerHTML = \`
        <div class="simple-chart">
            <div class="chart-bars">\${bars}</div>
            <div class="chart-labels">
                \${(data.labels || []).map(label => \`<div class="chart-label">\${label}</div>\`).join('')}
            </div>
        </div>
    \`;
    
    // Add styles for simple chart
    if (!document.querySelector('#simple-chart-styles')) {
        const styles = document.createElement('style');
        styles.id = 'simple-chart-styles';
        styles.textContent = \`
            .simple-chart {
                height: 300px;
                display: flex;
                flex-direction: column;
            }
            
            .chart-bars {
                flex: 1;
                display: flex;
                align-items: flex-end;
                gap: 10px;
                padding: 0 10px;
                border-bottom: 1px solid var(--border);
            }
            
            .chart-bar {
                flex: 1;
                background: linear-gradient(to top, #667eea, #764ba2);
                border-radius: 4px 4px 0 0;
                position: relative;
                transition: height 0.3s ease;
            }
            
            .chart-bar-value {
                position: absolute;
                top: -25px;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
            
            .chart-labels {
                display: flex;
                justify-content: space-around;
                padding: 10px 0;
                border-top: 1px solid var(--border);
            }
            
            .chart-label {
                font-size: 0.75rem;
                color: var(--text-secondary);
                text-align: center;
            }
            
            @media (max-width: 768px) {
                .simple-chart {
                    height: 250px;
                }
                
                .chart-bar-value {
                    font-size: 0.625rem;
                    top: -20px;
                }
                
                .chart-label {
                    font-size: 0.625rem;
                }
            }
        \`;
        document.head.appendChild(styles);
    }
}

/**
 * Export dashboard data
 */
async function exportDashboardData() {
    try {
        showLoading(true);
        
        const response = await apiGet(API_ENDPOINTS.DASHBOARD_EXPORT);
        
        if (response.success && response.url) {
            // Create download link
            const link = document.createElement('a');
            link.href = response.url;
            link.download = \`dashboard-export-\${new Date().toISOString().split('T')[0]}.csv\`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification('Export downloaded successfully', 'success');
        }
    } catch (error) {
        console.error('Export failed:', error);
        showNotification('Export failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Format currency (short version for chart)
 */
function formatCurrencyShort(amount) {
    if (amount >= 1000000) {
        return 'KES ' + (amount / 1000000).toFixed(1) + 'M';
    }
    if (amount >= 1000) {
        return 'KES ' + (amount / 1000).toFixed(1) + 'K';
    }
    return 'KES ' + amount;
}

/**
 * Format time ago
 */
function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return \`\${diffMins} minutes ago\`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return \`\${diffHours} hours ago\`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return \`\${diffDays} days ago\`;
    
    return date.toLocaleDateString();
}

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
}

/**
 * Initialize chart (placeholder)
 */
function initializeChart() {
    // Chart initialization will happen in loadChartData
}

// Make functions available globally
window.loadDashboardData = loadDashboardData;
window.loadChartData = loadChartData;
window.exportDashboardData = exportDashboardData;

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
`;
        
        fs.writeFileSync(JS_FILE_PATH, adminJS, 'utf8');
        console.log('✅ Created admin.js with comprehensive mobile features');
    } else {
        console.log('✅ admin.js exists. Checking for mobile/responsive features...');
        const jsContent = fs.readFileSync(JS_FILE_PATH, 'utf8');
        
        // Check for mobile/responsive features
        const checks = {
            'Loading states': jsContent.includes('showLoading') || jsContent.includes('loadingOverlay'),
            'Empty states': jsContent.includes('empty-state') || jsContent.includes('No recent activity'),
            'Responsive chart': jsContent.includes('responsive: true') || jsContent.includes('window.addEventListener') && jsContent.includes('resize'),
            'Error handling': jsContent.includes('catch') && jsContent.includes('error'),
            'Mobile event handlers': jsContent.includes('addEventListener') && (jsContent.includes('click') || jsContent.includes('resize')),
            'Format helpers': jsContent.includes('formatCurrency') || jsContent.includes('formatTimeAgo'),
            'Debounce function': jsContent.includes('debounce') || jsContent.includes('clearTimeout')
        };
        
        console.log('\n📊 admin.js status:');
        Object.entries(checks).forEach(([feature, exists]) => {
            console.log(`   ${exists ? '✅' : '❌'} ${feature}`);
        });
        
        if (!checks['Responsive chart'] || !checks['Debounce function']) {
            console.log('\n⚠️  Consider adding responsive chart handling and debounce for resize events.');
        }
    }
}

// Run the check
checkAdminJS();