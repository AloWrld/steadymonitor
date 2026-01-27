// Global API Helper for SteadyMonitor
// Access via window.API or window.apiCall

(function() {
    'use strict';
    
    const API_BASE = 'http://localhost:3001';
    
    // Main API object
    const API = {
        
        // Core fetch wrapper
        call: async function(endpoint, options = {}) {
            const url = endpoint.startsWith('/') ? `${API_BASE}${endpoint}` : endpoint;
            
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                mode: 'cors'
            };

            const config = { ...defaultOptions, ...options };
            
            try {
                console.log('[API] Calling:', url);
                const response = await fetch(url, config);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[API] Error:', response.status, errorText);
                    
                    if (response.status === 401) {
                        window.location.href = '/login.html';
                        return null;
                    }
                    
                    throw new Error(`API Error ${response.status}: ${errorText.substring(0, 100)}`);
                }
                
                const data = await response.json();
                console.log('[API] Success:', data);
                return data;
            } catch (error) {
                console.error('[API] Fetch failed:', error);
                throw error;
            }
        },
        
        // Authentication
        login: async function(username, password) {
            return this.call('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
        },
        
        logout: async function() {
            return this.call('/api/auth/logout', { method: 'POST' });
        },
        
        checkAuth: async function() {
            return this.call('/api/auth/check');
        },
        
        getPermissions: async function() {
            return this.call('/api/auth/permissions');
        },
        
        // Customers
        getCustomers: async function() {
            return this.call('/api/customers');
        },
        
        getCustomerById: async function(id) {
            return this.call(`/api/customers/${id}`);
        },
        
        createCustomer: async function(customerData) {
            return this.call('/api/customers', {
                method: 'POST',
                body: JSON.stringify(customerData)
            });
        },
        
        // Products & Inventory
        getProducts: async function() {
            return this.call('/api/inventory/products');
        },
        
        getDepartmentProducts: async function(department) {
            return this.call(`/api/pos/products/${department}`);
        },
        
        getLowStock: async function() {
            return this.call('/api/inventory/low-stock');
        },
        
        // Dashboard
        getDashboardStats: async function() {
            return this.call('/api/dashboard/stats');
        },
        
        getRecentSales: async function() {
            return this.call('/api/dashboard/recent-sales');
        },
        
        getCustomerBalances: async function() {
            return this.call('/api/dashboard/customers-balance');
        },
        
        // POS
        getDepartments: async function() {
            return this.call('/api/pos/departments');
        },
        
        getClasses: async function() {
            return this.call('/api/pos/classes');
        },
        
        searchLearners: async function(query) {
            return this.call(`/api/pos/learners/search?q=${encodeURIComponent(query)}`);
        },
        
        checkout: async function(saleData) {
            return this.call('/api/pos/checkout', {
                method: 'POST',
                body: JSON.stringify(saleData)
            });
        },
        
        // Print
        printReceipt: async function(saleId) {
            return this.call('/api/print/receipt', {
                method: 'POST',
                body: JSON.stringify({ sale_id: saleId })
            });
        },
        
        // Reports
        getSalesReport: async function(params = {}) {
            const query = new URLSearchParams(params).toString();
            return this.call(`/api/reports/sales?${query}`);
        },
        
        // Test function
        testAll: async function() {
            console.log('Testing API connectivity...');
            
            const endpoints = [
                '/api/auth/check',
                '/api/customers',
                '/api/inventory/products',
                '/api/dashboard/stats',
                '/api/pos/departments'
            ];
            
            const results = {};
            
            for (const endpoint of endpoints) {
                try {
                    const data = await this.call(endpoint);
                    results[endpoint] = { success: true, data: data ? 'OK' : 'No data' };
                } catch (error) {
                    results[endpoint] = { success: false, error: error.message };
                }
            }
            
            return results;
        }
    };
    
    // Expose to window
    window.API = API;
    window.apiCall = API.call.bind(API);
    
    console.log('API loaded successfully');
})();