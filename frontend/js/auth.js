// Global Auth Helper - Works with menu.js
// Access via window.auth

(function() {
    'use strict';
    
    const Auth = {
        user: null,
        initialized: false,
        
        // Initialize auth
        async init() {
            if (this.initialized) return;
            
            try {
                const response = await API.call('/api/auth/check');
                
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
                const response = await API.login(username, password);
                
                if (response && response.success) {
                    this.user = response.user;
                    this.initialized = true;
                    
                    // Redirect based on role
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
                await API.logout();
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
                window.location.href = '/login.html';
                return false;
            }
            
            return true;
        },
        
        // Redirect based on role (matching your menu.js structure)
        redirectByRole(user) {
            if (!user || !user.role) {
                window.location.href = '/login.html';
                return;
            }
            
            const role = user.role;
            let redirectTo = '/login.html';
            
            // Admin goes to admin.html
            if (role === 'admin') {
                redirectTo = '/admin.html';
            }
            // Department users go to department.html
            else if (role.startsWith('department_')) {
                redirectTo = '/department.html';
            }
            // Cashier/manager roles
            else if (role === 'cashier' || role === 'manager') {
                redirectTo = '/pos.html';
            }
            
            console.log(`Redirecting ${role} to ${redirectTo}`);
            window.location.href = redirectTo;
        },
        
        // Check permissions
        async hasPermission(permission) {
            try {
                const response = await API.getPermissions();
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
        }
    };
    
    // Expose to window
    window.auth = Auth;
    
    // Auto-initialize on pages that need auth
    document.addEventListener('DOMContentLoaded', async function() {
        // Don't auto-init on login page
        if (window.location.pathname.includes('login.html')) {
            return;
        }
        
        // Initialize auth for protected pages
        await Auth.init();
        
        // Check if we need to redirect to login
        if (!Auth.user && !window.location.pathname.includes('login.html')) {
            window.location.href = '/login.html';
        }
    });
    
    console.log('Auth loaded successfully');
})();