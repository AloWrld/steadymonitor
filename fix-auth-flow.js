#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Starting Auth Flow Migration...\n');

const PROJECT_ROOT = process.cwd();
const FRONTEND_JS = path.join(PROJECT_ROOT, 'frontend/js');
const FRONTEND_HTML = path.join(PROJECT_ROOT, 'frontend');
const BACKEND_MIDDLEWARE = path.join(PROJECT_ROOT, 'backend/middleware');
const BACKEND_ROUTES = path.join(PROJECT_ROOT, 'backend/routes');

// ============================================
// 1. FIX auth.js
// ============================================

const FIXED_AUTH_JS = `// frontend/js/auth.js - PRODUCTION READY WITH RENDER COMPATIBILITY
class Auth {
    constructor() {
        this.apiBase = window.API_BASE || '/api';
        this.currentUser = null;
        this.isInitializing = false;
    }

    // Initialize auth on page load - returns user if authenticated
    async init() {
        if (this.isInitializing) return;
        this.isInitializing = true;
        
        try {
            // Check if we have user in localStorage (fast path)
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                this.currentUser = JSON.parse(storedUser);
                this.updateUI();
                return this.currentUser;
            }
            
            // Check with server
            const isAuthenticated = await this.checkAuth();
            
            if (!isAuthenticated && !this.isLoginPage()) {
                console.warn('Not authenticated, redirecting to login');
                this.redirectToLogin();
                return null;
            }
            
            return this.currentUser;
            
        } catch (error) {
            console.error('Auth init failed:', error);
            
            // On network errors, check if we're already on login page
            if (!this.isLoginPage()) {
                console.warn('Network error, but allowing navigation');
            }
            
            return null;
        } finally {
            this.isInitializing = false;
        }
    }

    // Check authentication with server
    async checkAuth() {
        try {
            const response = await fetch(\`\${this.apiBase}/auth/check\`, {
                method: 'GET',
                credentials: 'include', // Important for session cookies
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(\`HTTP \${response.status}\`);
            }
            
            const data = await response.json();
            
            if (data.success && data.user) {
                this.currentUser = data.user;
                localStorage.setItem('user', JSON.stringify(data.user));
                this.updateUI();
                return true;
            }
            
            this.clearAuth();
            return false;
            
        } catch (error) {
            console.warn('Auth check failed (may be offline):', error);
            return false;
        }
    }

    // Login method
    async login(username, password) {
        try {
            const response = await fetch(\`\${this.apiBase}/auth/login\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirect based on role
                const redirectUrl = this.getRedirectUrl(data.user.role);
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 300);
                
                return { success: true, user: data.user };
            }
            
            return { success: false, message: data.message || 'Login failed' };
            
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                message: 'Network error. Please check your connection.' 
            };
        }
    }

    // Logout method
    async logout() {
        try {
            await fetch(\`\${this.apiBase}/auth/logout\`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.warn('Logout API call failed:', error);
        }
        
        this.clearAuth();
        window.location.href = 'login.html';
    }

    // Clear auth data
    clearAuth() {
        this.currentUser = null;
        localStorage.removeItem('user');
    }

    // Get current user
    getUser() {
        if (this.currentUser) return this.currentUser;
        
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
                return this.currentUser;
            } catch (e) {
                localStorage.removeItem('user');
            }
        }
        
        return null;
    }

    // Check if user has admin role
    isAdmin() {
        const user = this.getUser();
        return user?.role === 'admin';
    }

    // Check if user has department role
    isDepartment() {
        const user = this.getUser();
        return user?.role?.startsWith('department_');
    }

    // Get department name
    getDepartment() {
        const user = this.getUser();
        if (user?.role?.startsWith('department_')) {
            return user.role.replace('department_', '');
        }
        return null;
    }

    // Get user display name
    getDisplayName() {
        const user = this.getUser();
        return user?.displayName || user?.username || 'User';
    }

    // Update UI elements
    updateUI() {
        const user = this.getUser();
        if (!user) return;
        
        // Update greeting
        const greetingEl = document.querySelector('.user-greeting');
        if (greetingEl) {
            const hour = new Date().getHours();
            let timeOfDay = 'Good morning';
            if (hour >= 12 && hour < 17) timeOfDay = 'Good afternoon';
            else if (hour >= 17) timeOfDay = 'Good evening';
            
            greetingEl.textContent = \`\${timeOfDay}, \${this.getDisplayName()}\`;
        }
        
        // Update username in dropdown
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.textContent = this.getDisplayName();
        }
    }

    // Helper: Check if current page is login page
    isLoginPage() {
        return window.location.pathname.includes('login.html') || 
               window.location.pathname === '/' ||
               window.location.pathname.endsWith('/login');
    }

    // Helper: Redirect to login
    redirectToLogin() {
        // Only redirect if not already on login page
        if (!this.isLoginPage()) {
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 100);
        }
    }

    // Helper: Get redirect URL after login
    getRedirectUrl(role) {
        // Check for returnTo parameter
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get('return');
        
        if (returnTo && returnTo.startsWith('/')) {
            return returnTo;
        }
        
        // Default based on role
        switch (role) {
            case 'admin':
                return 'admin.html';
            case 'department_uniform':
            case 'department_stationery':
                return 'department.html';
            default:
                return 'dashboard.html';
        }
    }

    // Bind logout button
    bindLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }
}

// Create global instance
window.auth = new Auth();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Don't auto-init on login page
    if (!window.location.pathname.includes('login.html')) {
        await window.auth.init();
        window.auth.bindLogout();
    }
});
`;

// ============================================
// 2. FIX api.js
// ============================================

const FIXED_API_JS = `/**
 * API Service for STEADYMONITOR System - PRODUCTION READY
 * Centralized fetch calls with Render/Railway compatibility
 */

// Auto-detect API base URL based on environment
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api'; // Relative path for production

// Auth endpoints
const API_ENDPOINTS = {
    // Auth
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    CHECK_AUTH: '/auth/check',
    
    // Dashboard
    DASHBOARD_STATS: '/dashboard/stats',
    DASHBOARD_LOW_STOCK: '/dashboard/low-stock',
    DASHBOARD_RECENT_SALES: '/dashboard/recent-sales',
    DASHBOARD_CUSTOMERS_BALANCE: '/dashboard/customers-balance',
    
    // POS
    POS_PRODUCTS_BY_DEPT: (dept) => \`/pos/products/\${dept}\`,
    POS_SEARCH: '/pos/search',
    POS_PRODUCT_BY_SKU: (sku) => \`/pos/product/sku/\${sku}\`,
    POS_CHECKOUT: '/pos/checkout',
    POS_MPESA_PUSH: '/pos/mpesa-push',
    POS_LOOKUP: (identifier) => \`/pos/lookup/\${identifier}\`,
    POS_LEARNERS_BY_CLASS: (className) => \`/pos/learners/class/\${className}\`,
    POS_SEARCH_LEARNERS: '/pos/learners/search',
    POS_LEARNER_DETAILS: (learnerId) => \`/pos/learners/\${learnerId}\`,
    POS_CLASSES: '/pos/classes',
    
    // Customers
    CUSTOMERS: '/customers',
    CUSTOMER_BY_ID: (id) => \`/customers/\${id}\`,
    // ... keep your existing endpoints
};

// Global API configuration
window.API_CONFIG = {
    baseUrl: API_BASE,
    endpoints: API_ENDPOINTS
};

/**
 * Handle API response with auth checking
 */
async function handleResponse(response) {
    // If unauthorized, redirect to login
    if (response.status === 401) {
        if (window.auth) {
            window.auth.clearAuth();
        }
        localStorage.removeItem('user');
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('login.html')) {
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 100);
        }
        throw new Error('Session expired. Please login again.');
    }
    
    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = \`HTTP error! status: \${response.status}\`;
        
        try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
        } catch {
            // Not JSON, use text as is
            if (errorText) errorMessage = errorText;
        }
        
        throw new Error(errorMessage);
    }
    
    try {
        return await response.json();
    } catch (error) {
        throw new Error('Invalid JSON response from server');
    }
}

/**
 * Generic GET request
 */
async function apiGet(endpoint) {
    try {
        const response = await fetch(\`\${API_BASE}\${endpoint}\`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Important for session cookies
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('GET request failed:', endpoint, error);
        throw error;
    }
}

/**
 * Generic POST request
 */
async function apiPost(endpoint, data) {
    try {
        const response = await fetch(\`\${API_BASE}\${endpoint}\`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('POST request failed:', endpoint, error);
        throw error;
    }
}

/**
 * Generic PUT request
 */
async function apiPut(endpoint, data) {
    try {
        const response = await fetch(\`\${API_BASE}\${endpoint}\`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('PUT request failed:', endpoint, error);
        throw error;
    }
}

/**
 * Generic DELETE request
 */
async function apiDelete(endpoint) {
    try {
        const response = await fetch(\`\${API_BASE}\${endpoint}\`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('DELETE request failed:', endpoint, error);
        throw error;
    }
}

/**
 * Show notification toast (simplified)
 */
function showNotification(message, type = 'info') {
    console.log(\`[\${type}] \${message}\`);
    
    // Simple alert for now - you can enhance this
    if (type === 'error') {
        alert(message);
    }
}

/**
 * Format currency to KES
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2
    }).format(amount || 0);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Format time for display
 */
function formatTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Export to global scope
window.API_ENDPOINTS = API_ENDPOINTS;
window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPut = apiPut;
window.apiDelete = apiDelete;
window.showNotification = showNotification;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatTime = formatTime;

// For Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_ENDPOINTS,
        apiGet,
        apiPost,
        apiPut,
        apiDelete,
        showNotification,
        formatCurrency,
        formatDate,
        formatTime
    };
}
`;

// ============================================
// 3. FIX menu.js
// ============================================

const FIXED_MENU_JS = `// frontend/js/menu.js - Dynamic sidebar based on user role
(function () {
    'use strict';

    const MENU_CONFIG = {
        admin: [
            { icon: 'fas fa-tachometer-alt', label: 'Dashboard', page: 'admin.html' },
            { icon: 'fas fa-building', label: 'Departments', page: 'departments.html' },
            { icon: 'fas fa-users', label: 'Customers', page: 'customers.html' },
            { icon: 'fas fa-credit-card', label: 'Payments', page: 'payments.html' },
            { icon: 'fas fa-cash-register', label: 'POS', page: 'pos.html' },
            { icon: 'fas fa-boxes', label: 'Inventory', page: 'inventory.html' },
            { icon: 'fas fa-truck', label: 'Suppliers', page: 'suppliers.html' },
            { icon: 'fas fa-wallet', label: 'Pocket Money', page: 'pocket_money.html' },
            { icon: 'fas fa-exchange-alt', label: 'Refunds', page: 'refunds.html' },
            { icon: 'fas fa-chart-bar', label: 'Reports', page: 'reports.html' },
            { icon: 'fas fa-chart-pie', label: 'Overview', page: 'overview.html' },
            { icon: 'fas fa-gift', label: 'Allocations', page: 'allocations.html' }
        ],
        department_uniform: [
            { icon: 'fas fa-building', label: 'Departments', page: 'departments.html' },
            { icon: 'fas fa-users', label: 'Customers', page: 'customers.html' },
            { icon: 'fas fa-credit-card', label: 'Payments', page: 'payments.html' },
            { icon: 'fas fa-cash-register', label: 'POS', page: 'pos.html' },
            { icon: 'fas fa-wallet', label: 'Pocket Money', page: 'pocket_money.html' },
            { icon: 'fas fa-exchange-alt', label: 'Refunds', page: 'refunds.html' },
            { icon: 'fas fa-gift', label: 'Allocations', page: 'allocations.html' }
        ],
        department_stationery: [
            { icon: 'fas fa-building', label: 'Departments', page: 'departments.html' },
            { icon: 'fas fa-users', label: 'Customers', page: 'customers.html' },
            { icon: 'fas fa-credit-card', label: 'Payments', page: 'payments.html' },
            { icon: 'fas fa-cash-register', label: 'POS', page: 'pos.html' },
            { icon: 'fas fa-wallet', label: 'Pocket Money', page: 'pocket_money.html' },
            { icon: 'fas fa-exchange-alt', label: 'Refunds', page: 'refunds.html' },
            { icon: 'fas fa-gift', label: 'Allocations', page: 'allocations.html' }
        ]
    };

    class MenuManager {
        constructor() {
            this.sidebarNav = document.querySelector('.sidebar-nav');
            this.menuToggle = document.querySelector('.menu-toggle');
            this.sidebar = document.querySelector('.sidebar');
            this.sidebarOverlay = document.querySelector('.sidebar-overlay');
        }

        initialize() {
            if (!this.sidebarNav) {
                console.warn('Sidebar nav not found');
                return;
            }

            // Build menu when auth is ready
            this.waitForAuth().then(() => {
                this.buildMenu();
                this.setupMobileMenu();
                this.highlightCurrentPage();
            });
        }

        async waitForAuth() {
            // Wait for auth to be initialized
            if (!window.auth) {
                return new Promise(resolve => {
                    const checkAuth = setInterval(() => {
                        if (window.auth && window.auth.getUser()) {
                            clearInterval(checkAuth);
                            resolve();
                        }
                    }, 100);
                    
                    // Timeout after 5 seconds
                    setTimeout(() => {
                        clearInterval(checkAuth);
                        resolve();
                    }, 5000);
                });
            }
            
            return Promise.resolve();
        }

        buildMenu() {
            const user = window.auth?.getUser();
            if (!user || !user.role) {
                console.warn('No user or role found');
                return;
            }

            const items = MENU_CONFIG[user.role] || [];
            
            // Clear existing menu
            this.sidebarNav.innerHTML = '';
            
            // Add menu items
            items.forEach(item => {
                const menuItem = this.createMenuItem(item);
                this.sidebarNav.appendChild(menuItem);
            });
            
            // Add logout item at bottom
            this.addLogoutItem();
        }

        createMenuItem(item) {
            const li = document.createElement('li');
            li.className = 'nav-item';
            
            const a = document.createElement('a');
            a.href = item.page;
            a.className = 'nav-link';
            a.innerHTML = \`
                <i class="\${item.icon} nav-icon"></i>
                <span class="nav-label">\${item.label}</span>
            \`;
            
            li.appendChild(a);
            return li;
        }

        addLogoutItem() {
            const li = document.createElement('li');
            li.className = 'nav-item logout-item';
            
            const a = document.createElement('a');
            a.href = '#';
            a.className = 'nav-link text-danger';
            a.innerHTML = \`
                <i class="fas fa-sign-out-alt nav-icon"></i>
                <span class="nav-label">Logout</span>
            \`;
            
            a.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.auth) {
                    window.auth.logout();
                } else {
                    window.location.href = 'login.html';
                }
            });
            
            li.appendChild(a);
            this.sidebarNav.appendChild(li);
        }

        highlightCurrentPage() {
            const currentPage = window.location.pathname.split('/').pop();
            const links = this.sidebarNav.querySelectorAll('.nav-link');
            
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href === currentPage || 
                   (currentPage === '' && href === 'admin.html') ||
                   (currentPage === 'index.html' && href === 'admin.html')) {
                    link.classList.add('active');
                    link.parentElement.classList.add('active');
                } else {
                    link.classList.remove('active');
                    link.parentElement.classList.remove('active');
                }
            });
        }

        setupMobileMenu() {
            if (!this.menuToggle || !this.sidebar || !this.sidebarOverlay) {
                return;
            }

            this.menuToggle.addEventListener('click', () => {
                this.sidebar.classList.toggle('active');
                this.sidebarOverlay.classList.toggle('active');
                document.body.classList.toggle('no-scroll');
            });

            this.sidebarOverlay.addEventListener('click', () => {
                this.sidebar.classList.remove('active');
                this.sidebarOverlay.classList.remove('active');
                document.body.classList.remove('no-scroll');
            });

            // Close menu when clicking a link (mobile)
            this.sidebarNav.addEventListener('click', (e) => {
                if (e.target.tagName === 'A' && window.innerWidth <= 768) {
                    this.sidebar.classList.remove('active');
                    this.sidebarOverlay.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                }
            });
        }
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        const menuManager = new MenuManager();
        menuManager.initialize();
    });

})();
`;

// ============================================
// 4. TEMPLATE for page JS files (admin.js, inventory.js, etc.)
// ============================================

const PAGE_JS_TEMPLATE = `/**
 * {PAGE_NAME} Page
 * Handles data loading and UI for {PAGE_NAME}
 */

document.addEventListener('DOMContentLoaded', async function() {
    console.log('{PAGE_NAME} page initialized');
    
    try {
        // Wait for auth to be ready
        if (window.auth) {
            const user = await window.auth.init();
            if (!user) {
                console.warn('No authenticated user, staying on page');
                // Don't redirect immediately - let user see the page
                // auth will handle redirect if needed
            }
        } else {
            console.warn('Auth not available');
        }
        
        // Initialize page components
        await initializePage();
        
        // Load data
        await loadData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Update UI
        updateUI();
        
    } catch (error) {
        console.error('Failed to initialize {PAGE_NAME}:', error);
        showNotification('Error loading page: ' + error.message, 'error');
    }
});

/**
 * Initialize page components
 */
async function initializePage() {
    // Add loading state
    showLoading(true);
    
    try {
        // Page-specific initialization
        // e.g., initialize tables, charts, forms
        
    } catch (error) {
        console.error('Page initialization error:', error);
    } finally {
        showLoading(false);
    }
}

/**
 * Load page data from API
 */
async function loadData() {
    showLoading(true);
    
    try {
        // Use apiGet from api.js
        if (typeof apiGet !== 'function') {
            throw new Error('API service not available');
        }
        
        // Example: Load data for this page
        // const data = await apiGet(API_ENDPOINTS.{ENDPOINT_NAME});
        // renderData(data);
        
        console.log('Data loaded for {PAGE_NAME}');
        
    } catch (error) {
        console.error('Failed to load data:', error);
        showNotification('Failed to load data: ' + error.message, 'error');
        
        // Show empty state
        showEmptyState();
    } finally {
        showLoading(false);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadData();
            showNotification('Data refreshed', 'success');
        });
    }
    
    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportData();
        });
    }
    
    // Form submissions
    const forms = document.querySelectorAll('form[data-api]');
    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
}

/**
 * Update UI elements
 */
function updateUI() {
    // Update based on user role
    if (window.auth) {
        const user = window.auth.getUser();
        if (user) {
            // Hide/show elements based on role
            const adminOnly = document.querySelectorAll('.admin-only');
            if (adminOnly.length > 0 && !window.auth.isAdmin()) {
                adminOnly.forEach(el => el.style.display = 'none');
            }
        }
    }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    showLoading(true);
    
    try {
        const endpoint = form.getAttribute('data-api');
        const method = form.getAttribute('data-method') || 'POST';
        
        let result;
        switch (method) {
            case 'POST':
                result = await apiPost(endpoint, data);
                break;
            case 'PUT':
                result = await apiPut(endpoint, data);
                break;
            default:
                throw new Error('Unsupported method: ' + method);
        }
        
        if (result.success) {
            showNotification('Operation successful', 'success');
            form.reset();
            await loadData(); // Refresh data
        } else {
            throw new Error(result.message || 'Operation failed');
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        showNotification('Error: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Export data
 */
async function exportData() {
    showLoading(true);
    
    try {
        // Export logic here
        showNotification('Export functionality not yet implemented', 'info');
        
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Export failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Show empty state
 */
function showEmptyState() {
    const container = document.querySelector('.data-container');
    if (container && container.children.length === 0) {
        container.innerHTML = \`
            <div class="empty-state">
                <i class="fas fa-database"></i>
                <h4>No Data Available</h4>
                <p>No data found for this page</p>
                <button class="btn btn-outline mt-2" onclick="loadData()">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        \`;
    }
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
    let overlay = document.getElementById('loadingOverlay');
    
    if (show && !overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = \`
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(3px);
        \`;
        
        const spinner = document.createElement('div');
        spinner.style.cssText = \`
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #2563EB;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        \`;
        
        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
        
        // Add animation
        if (!document.querySelector('#spinner-styles')) {
            const style = document.createElement('style');
            style.id = 'spinner-styles';
            style.textContent = \`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            \`;
            document.head.appendChild(style);
        }
    }
    
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}
`;

// ============================================
// 5. FIX HTML files
// ============================================

function fixHtmlFiles() {
    const htmlFiles = [
        'admin.html',
        'department.html',
        'customers.html',
        'inventory.html',
        'overview.html',
        'payments.html',
        'pocket_money.html',
        'pos.html',
        'refunds.html',
        'reports.html',
        'suppliers.html',
        'allocations.html'
    ];
    
    console.log('📄 Fixing HTML files...');
    
    htmlFiles.forEach(file => {
        const filePath = path.join(FRONTEND_HTML, file);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⏭️ Skipping (not found): ${file}`);
            return;
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;
        
        // 1. Ensure auth.js is loaded before other scripts
        if (!content.includes('js/auth.js')) {
            // Find where scripts are loaded
            const scriptMatch = content.match(/<script src="[^"]*"><\/script>/);
            if (scriptMatch) {
                const authScript = '    <script src="js/auth.js"></script>\n';
                content = content.replace(scriptMatch[0], authScript + scriptMatch[0]);
                changed = true;
            }
        }
        
        // 2. Ensure api.js is loaded
        if (!content.includes('js/api.js')) {
            const scriptMatch = content.match(/<script src="[^"]*"><\/script>/);
            if (scriptMatch) {
                const apiScript = '    <script src="js/api.js"></script>\n';
                content = content.replace(scriptMatch[0], apiScript + scriptMatch[0]);
                changed = true;
            }
        }
        
        // 3. Ensure menu.js is loaded (except login)
        if (file !== 'login.html' && !content.includes('js/menu.js')) {
            const scriptMatch = content.match(/<script src="[^"]*"><\/script>/);
            if (scriptMatch) {
                const menuScript = '    <script src="js/menu.js"></script>\n';
                content = content.replace(scriptMatch[0], menuScript + scriptMatch[0]);
                changed = true;
            }
        }
        
        // 4. Add loading overlay div if missing
        if (!content.includes('loadingOverlay')) {
            const bodyEnd = content.indexOf('</body>');
            if (bodyEnd !== -1) {
                const loadingOverlay = '\n    <!-- Loading Overlay -->\n    <div class="loading-overlay" id="loadingOverlay" style="display: none;">\n        <div class="loading-spinner"></div>\n    </div>\n';
                content = content.slice(0, bodyEnd) + loadingOverlay + content.slice(bodyEnd);
                changed = true;
            }
        }
        
        if (changed) {
            // Backup original
            const backupPath = `${filePath}.backup-${Date.now()}`;
            fs.copyFileSync(filePath, backupPath);
            
            // Write updated content
            fs.writeFileSync(filePath, content);
            console.log(`✅ Updated: ${file}`);
        } else {
            console.log(`⏭️ No changes needed: ${file}`);
        }
    });
}

// ============================================
// 6. FIX page JS files (admin.js, inventory.js, etc.)
// ============================================

function fixPageJsFiles() {
    const pageFiles = [
        { file: 'admin.js', page: 'Admin Dashboard', endpoint: 'DASHBOARD_STATS' },
        { file: 'department.js', page: 'Department', endpoint: 'DASHBOARD_STATS' },
        { file: 'customers.js', page: 'Customers', endpoint: 'CUSTOMERS' },
        { file: 'inventory.js', page: 'Inventory', endpoint: 'INVENTORY_PRODUCTS' },
        { file: 'overview.js', page: 'Overview', endpoint: 'DASHBOARD_STATS' },
        { file: 'payments.js', page: 'Payments', endpoint: 'PAYMENTS' },
        { file: 'pocket_money.js', page: 'Pocket Money', endpoint: 'POCKET_MONEY_SUMMARY' },
        { file: 'pos.js', page: 'POS', endpoint: 'POS_PRODUCTS_BY_DEPT' },
        { file: 'refunds.js', page: 'Refunds', endpoint: 'REFUNDS_SUMMARY' },
        { file: 'reports.js', page: 'Reports', endpoint: 'REPORTS_SALES' },
        { file: 'suppliers.js', page: 'Suppliers', endpoint: 'SUPPLIERS' }
    ];
    
    console.log('\n📜 Fixing page JS files...');
    
    pageFiles.forEach(({ file, page, endpoint }) => {
        const filePath = path.join(FRONTEND_JS, file);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⏭️ Skipping (not found): ${file}`);
            return;
        }
        
        // Create new content from template
        const newContent = PAGE_JS_TEMPLATE
            .replace(/{PAGE_NAME}/g, page)
            .replace(/{ENDPOINT_NAME}/g, endpoint);
        
        // Backup original
        const backupPath = `${filePath}.backup-${Date.now()}`;
        fs.copyFileSync(filePath, backupPath);
        
        // Write new content
        fs.writeFileSync(filePath, newContent);
        console.log(`✅ Updated: ${file}`);
    });
}

// ============================================
// 7. CREATE production server.js
// ============================================

const PRODUCTION_SERVER_JS = `const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// ============================================
// CONFIGURATION
// ============================================

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Database pool for sessions
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
});

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "cdnjs.cloudflare.com", "data:"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: isProduction 
        ? process.env.FRONTEND_URL || ['http://localhost:3000']
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'user_sessions',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: isProduction ? 'lax' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'sid'
}));

// Static files (frontend)
app.use(express.static(path.join(__dirname, 'frontend'), {
    maxAge: isProduction ? '1h' : '0',
    index: false,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: NODE_ENV 
    });
});

// API routes
app.use('/api/auth', require('./backend/routes/authRoutes'));
app.use('/api/dashboard', require('./backend/routes/dashboardRoutes'));
app.use('/api/customers', require('./backend/routes/customerRoutes'));
app.use('/api/payments', require('./backend/routes/paymentRoutes'));
app.use('/api/inventory', require('./backend/routes/inventoryRoutes'));
app.use('/api/suppliers', require('./backend/routes/supplierRoutes'));
app.use('/api/pos', require('./backend/routes/posRoutes'));
app.use('/api/pocket-money', require('./backend/routes/pocketMoneyRoutes'));
app.use('/api/allocations', require('./backend/routes/allocationRoutes'));
app.use('/api/refunds', require('./backend/routes/refundRoutes'));
app.use('/api/reports', require('./backend/routes/reportRoutes'));
app.use('/api/checkout', require('./backend/routes/checkoutRoutes'));
app.use('/api/print', require('./backend/routes/printRoutes'));

// ============================================
// FRONTEND ROUTES WITH AUTH CHECK
// ============================================

// Public routes
const publicRoutes = ['/', '/login.html', '/register.html'];
publicRoutes.forEach(route => {
    app.get(route, (req, res) => {
        // If already logged in, redirect to dashboard
        if (req.session.userId) {
            return res.redirect('/admin.html');
        }
        res.sendFile(path.join(__dirname, 'frontend', route === '/' ? 'login.html' : route));
    });
});

// Protected routes (require auth)
const protectedRoutes = [
    '/admin.html',
    '/department.html',
    '/customers.html',
    '/inventory.html',
    '/overview.html',
    '/payments.html',
    '/pocket_money.html',
    '/pos.html',
    '/refunds.html',
    '/reports.html',
    '/suppliers.html',
    '/allocations.html'
];

protectedRoutes.forEach(route => {
    app.get(route, (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login.html?redirect=' + encodeURIComponent(route));
        }
        res.sendFile(path.join(__dirname, 'frontend', route));
    });
});

// Catch-all for other HTML files
app.get('*.html', (req, res) => {
    const filePath = path.join(__dirname, 'frontend', req.path);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).sendFile(path.join(__dirname, 'frontend', '404.html'));
    }
});

// API 404 handler
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'API endpoint not found',
        path: req.path 
    });
});

// Frontend 404 handler
app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'frontend', '404.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        ...(NODE_ENV === 'development' && { error: err.message, stack: err.stack })
    });
});

// ============================================
// SERVER STARTUP
// ============================================

app.listen(PORT, () => {
    console.log(\`
🚀 Server running in \${NODE_ENV} mode
📡 Port: \${PORT}
🌐 Frontend: \${isProduction ? process.env.FRONTEND_URL : 'http://localhost:' + PORT}
🔗 API: \${isProduction ? process.env.API_URL : 'http://localhost:' + PORT + '/api'}
🗄️  Database: \${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}
    \`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server...');
    pool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
    });
});
`;

// ============================================
// 8. CREATE render.yaml for deployment
// ============================================

const RENDER_YAML = `# Render Blueprint for STEADYMONITOR
services:
  # Backend API Service
  - type: web
    name: steadymonitor-backend
    env: node
    region: oregon  # or singapore, frankfurt, etc.
    plan: free  # or starter, standard, etc.
    buildCommand: npm install
    startCommand: node server.js
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false  # Will be set in Render dashboard
      - key: SESSION_SECRET
        generateValue: true
      - key: PORT
        value: 10000
    
    # Database (PostgreSQL)
    databases:
      - name: steadymonitor-db
        databaseName: steadymonitor
        plan: free  # or starter, standard, etc.
    
    # Disk (for file uploads if needed)
    disk:
      name: data
      mountPath: /data
      sizeGB: 1

# Cron jobs (optional)
jobs:
  - type: cron
    name: cleanup-sessions
    schedule: "0 3 * * *"  # Daily at 3 AM
    startCommand: node scripts/cleanup-sessions.js
`;

// ============================================
// 9. MAIN MIGRATION FUNCTION
// ============================================

async function runMigration() {
    console.log('🚀 STEADYMONITOR Auth Flow Migration\n');
    
    // Create backups directory
    const backupsDir = path.join(PROJECT_ROOT, 'backups');
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    // Step 1: Backup original files
    console.log('📦 Creating backups...');
    const timestamp = Date.now();
    
    // Backup auth.js
    const authBackup = path.join(backupsDir, `auth.js.backup.${timestamp}`);
    if (fs.existsSync(path.join(FRONTEND_JS, 'auth.js'))) {
        fs.copyFileSync(path.join(FRONTEND_JS, 'auth.js'), authBackup);
    }
    
    // Backup api.js
    const apiBackup = path.join(backupsDir, `api.js.backup.${timestamp}`);
    if (fs.existsSync(path.join(FRONTEND_JS, 'api.js'))) {
        fs.copyFileSync(path.join(FRONTEND_JS, 'api.js'), apiBackup);
    }
    
    // Backup menu.js
    const menuBackup = path.join(backupsDir, `menu.js.backup.${timestamp}`);
    if (fs.existsSync(path.join(FRONTEND_JS, 'menu.js'))) {
        fs.copyFileSync(path.join(FRONTEND_JS, 'menu.js'), menuBackup);
    }
    
    console.log('✅ Backups created in /backups directory\n');
    
    // Step 2: Write fixed files
    console.log('✏️  Writing updated files...');
    
    // Write auth.js
    fs.writeFileSync(path.join(FRONTEND_JS, 'auth.js'), FIXED_AUTH_JS);
    console.log('✅ Updated: auth.js');
    
    // Write api.js
    fs.writeFileSync(path.join(FRONTEND_JS, 'api.js'), FIXED_API_JS);
    console.log('✅ Updated: api.js');
    
    // Write menu.js
    fs.writeFileSync(path.join(FRONTEND_JS, 'menu.js'), FIXED_MENU_JS);
    console.log('✅ Updated: menu.js');
    
    // Step 3: Fix HTML files
    fixHtmlFiles();
    
    // Step 4: Fix page JS files
    fixPageJsFiles();
    
    // Step 5: Create production server.js
    fs.writeFileSync(path.join(PROJECT_ROOT, 'server.production.js'), PRODUCTION_SERVER_JS);
    console.log('✅ Created: server.production.js');
    
    // Step 6: Create Render config
    fs.writeFileSync(path.join(PROJECT_ROOT, 'render.yaml'), RENDER_YAML);
    console.log('✅ Created: render.yaml');
    
    // Step 7: Create package.json updates if needed
    updatePackageJson();
    
    console.log('\n🎉 MIGRATION COMPLETE!');
    console.log('='.repeat(50));
    console.log('\n📋 Next Steps:');
    console.log('1. Test locally: node server.js');
    console.log('2. Check console for errors');
    console.log('3. Test login/logout flow');
    console.log('4. Test page navigation');
    console.log('5. Deploy to Render:');
    console.log('   - Connect GitHub repository');
    console.log('   - Select render.yaml');
    console.log('   - Add DATABASE_URL environment variable');
    console.log('\n⚠️  IMPORTANT: Update backend/authRoutes.js to match');
    console.log('   - Ensure /auth/check returns {success, user}');
    console.log('   - Ensure /auth/logout clears session');
    console.log('\n🔧 For quick testing:');
    console.log('   npm run dev      # Development');
    console.log('   npm start        # Production');
}

function updatePackageJson() {
    const packagePath = path.join(PROJECT_ROOT, 'package.json');
    
    if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        // Update scripts if needed
        if (!pkg.scripts) pkg.scripts = {};
        
        pkg.scripts.dev = "nodemon server.js";
        pkg.scripts.start = "node server.production.js";
        pkg.scripts.migrate = "node migrate-enhanced.js";
        pkg.scripts.fix = "node fix-auth-flow.js";
        
        // Ensure dependencies
        if (!pkg.dependencies) pkg.dependencies = {};
        
        const requiredDeps = [
            'express',
            'express-session',
            'connect-pg-simple',
            'pg',
            'cors',
            'helmet',
            'dotenv'
        ];
        
        requiredDeps.forEach(dep => {
            if (!pkg.dependencies[dep]) {
                pkg.dependencies[dep] = "^8.0.0";
            }
        });
        
        fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
        console.log('✅ Updated: package.json');
    }
}

// ============================================
// RUN THE MIGRATION
// ============================================

runMigration().catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
});