// Global Auth Helper - Works with menu.js
// Access via window.auth

(function() {
    'use strict';
    
    // Add this function at the top (as instructed)
    function goToPage(page) {
        if (typeof window.loadPage === 'function') {
            window.loadPage(page);
        } else {
            window.location.hash = `#${page}`;
        }
    }
    
    const Auth = {
        user: null,
        initialized: false,
        
        // Initialize auth
        async init() {
            if (this.initialized) return;
            
            try {
                const response = await API.call('https://steadymonitor-backend.onrender.com/api/auth/check');
                
                if (response && response.success && response.isAuthenticated) {
                    this.user = response.user;
                    console.log('Auth initialized:', this.user);
                } else {
                    this.user = null;
                }
                
                this.initialized = true;
                return this.user;
            } catch (error) {
                console.error('Auth init failed:', error);
                this.user = null;
                this.initialized = true;
                return null;
            }
        },
        
        // Get current user (for menu.js)
        getUser() {
            return this.user;
        },
        
        // Login function (for login.html)
        async login(username, password) {
            try {
                const response = await API.auth.login({ username, password });
                
                if (response && response.success) {
                    this.user = response.user;
                    this.initialized = true;
                    
                    // Redirect based on role (using goToPage)
                    this.redirectByRole(response.user);
                    
                    return response;
                } else {
                    throw new Error(response?.message || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                throw error;
            }
        },
        
        // Logout function (for menu.js)
        async logout() {
            try {
                await API.auth.logout();
                this.user = null;
                this.initialized = false;
                return true;
            } catch (error) {
                console.error('Logout error:', error);
                return false;
            }
        },
        
        // Check if authenticated (for protected pages)
async requireAuth() {
    if (!this.initialized) {
        await this.init();
    }
    
    if (!this.user) {
        // For direct file access (like pos.html), redirect to index.html
        if (!window.location.hash) {
            window.location.href = 'index.html';
        } else {
            // For hash-based routing
            goToPage('login');
        }
        return false;
    }
    
    return true;
},
        
        // Redirect based on role (matching your menu.js structure)
        redirectByRole(user) {
            if (!user || !user.role) {
                goToPage('login');
                return;
            }
            
            const role = user.role;
            let pageName = 'login';
            
            // Admin goes to admin
            if (role === 'admin') {
                pageName = 'admin';
            }
            // Department users go to department
            else if (role.startsWith('department_')) {
                pageName = 'department';
            }
            // Cashier/manager roles
            else if (role === 'cashier' || role === 'manager') {
                pageName = 'pos';
            }
            
            console.log(`Redirecting ${role} to ${pageName}`);
            goToPage(pageName);
        },
        
        // Check permissions
        async hasPermission(permission) {
            try {
                const response = await API.auth.permissions();
                return response.success && response.permissions.includes(permission);
            } catch (error) {
                return false;
            }
        },
        
        // Get user role
        getRole() {
            return this.user?.role || null;
        },
        
        // Get department
        getDepartment() {
            return this.user?.department || null;
        },
        
        // Add checkAuth function (used by index.html)
        async checkAuth() {
            if (!this.initialized) {
                await this.init();
            }
            return !!this.user;
        }
    };
    
    // Expose to window
    window.auth = Auth;
    
  // Auto-initialize on pages that need auth
document.addEventListener('DOMContentLoaded', async function() {
    // Don't auto-init on login/index page
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname === '/' || 
        window.location.pathname.endsWith('/')) {
        return;
    }
    
    // Initialize auth for protected pages
    await Auth.init();
    
    // Check if we need to redirect to index.html
    if (!Auth.user) {
        // Check if this is a direct file access (no hash)
        if (!window.location.hash) {
            window.location.href = 'index.html';
        } else {
            // For hash-based routing
            goToPage('login');
        }
    }
});
    
    console.log('Auth loaded successfully');
})();
