/**
 * Department Page
 * Handles data loading and UI for Department
 */

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Department page initialized');
    
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
        console.error('Failed to initialize Department:', error);
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
        // const data = await apiGet(API_ENDPOINTS.DASHBOARD_STATS);
        // renderData(data);
        
        console.log('Data loaded for Department');
        
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
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-database"></i>
                <h4>No Data Available</h4>
                <p>No data found for this page</p>
                <button class="btn btn-outline mt-2" onclick="loadData()">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
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
        overlay.style.cssText = `
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
        `;
        
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #2563EB;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;
        
        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
        
        // Add animation
        if (!document.querySelector('#spinner-styles')) {
            const style = document.createElement('style');
            style.id = 'spinner-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}
