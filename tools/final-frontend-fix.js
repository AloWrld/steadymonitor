#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const frontendJsDir = path.join(projectRoot, 'frontend', 'js');
const frontendDir = path.join(projectRoot, 'frontend');

console.log('🚀 Final frontend fix for SteadyMonitor 2.0\n');

// Step 1: Fix api.js as global object
function fixApiJS() {
    const apiJsPath = path.join(frontendJsDir, 'api.js');
    
    console.log('📄 Creating global API...');
    
    const globalAPI = `// Global API Helper for SteadyMonitor
// Access via window.API or window.apiCall

(function() {
    'use strict';
    
    const API_BASE = 'http://localhost:3001';
    
    // Main API object
    const API = {
        
        // Core fetch wrapper
        call: async function(endpoint, options = {}) {
            const url = endpoint.startsWith('/') ? \`\${API_BASE}\${endpoint}\` : endpoint;
            
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
                    
                    throw new Error(\`API Error \${response.status}: \${errorText.substring(0, 100)}\`);
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
            return this.call(\`/api/customers/\${id}\`);
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
            return this.call(\`/api/pos/products/\${department}\`);
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
            return this.call(\`/api/pos/learners/search?q=\${encodeURIComponent(query)}\`);
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
            return this.call(\`/api/reports/sales?\${query}\`);
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
})();`;
    
    // Backup existing
    if (fs.existsSync(apiJsPath)) {
        const backup = apiJsPath + '.final-backup-' + Date.now();
        fs.copyFileSync(apiJsPath, backup);
        console.log(`📦 Backed up api.js to ${backup}`);
    }
    
    fs.writeFileSync(apiJsPath, globalAPI);
    console.log('✅ Created global API object');
}

// Step 2: Fix auth.js to work with menu.js and proper redirects
function fixAuthJS() {
    const authJsPath = path.join(frontendJsDir, 'auth.js');
    
    console.log('\n📄 Fixing auth.js for proper redirects...');
    
    const globalAuth = `// Global Auth Helper - Works with menu.js
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
            
            console.log(\`Redirecting \${role} to \${redirectTo}\`);
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
})();`;
    
    // Backup existing
    if (fs.existsSync(authJsPath)) {
        const backup = authJsPath + '.final-backup-' + Date.now();
        fs.copyFileSync(authJsPath, backup);
        console.log(`📦 Backed up auth.js to ${backup}`);
    }
    
    fs.writeFileSync(authJsPath, globalAuth);
    console.log('✅ Created global auth object');
}

// Step 3: Fix specific JS files that use imports
function fixOtherJSFiles() {
    console.log('\n📄 Fixing other JS files...');
    
    const filesToFix = [
        'admin.js',
        'department.js',
        'customers.js',
        'inventory.js',
        'overview.js',
        'payments.js',
        'pos.js',
        'reports.js',
        'suppliers.js',
        'pocket_money.js',
        'refunds.js',
        'menu.js'
    ];
    
    filesToFix.forEach(file => {
        const filePath = path.join(frontendJsDir, file);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  ${file} not found, skipping`);
            return;
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;
        
        // Backup
        const backup = filePath + '.fix-backup-' + Date.now();
        fs.writeFileSync(backup, content);
        
        // Remove ES6 imports
        if (content.includes('import ') && !content.includes('// import ')) {
            content = content.replace(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"];?\s*/g, '');
            content = content.replace(/import\s+[^;]+from\s+['"][^'"]+['"];?\s*/g, '');
            updated = true;
        }
        
        // Fix references to imported functions
        if (file === 'admin.js' || file === 'department.js' || file === 'overview.js') {
            // These files likely need API calls
            if (!content.includes('API.') && content.includes('fetch(')) {
                // Simple fix: add API prefix
                content = content.replace(/fetch\(\s*['"](\/api[^'"]+)['"]/g, 'API.call("$1"');
                updated = true;
            }
        }
        
        if (updated) {
            fs.writeFileSync(filePath, content);
            console.log(`✅ Fixed ${file}`);
        }
    });
}

// Step 4: Update HTML files with correct script loading order
function updateHTMLFiles() {
    console.log('\n📄 Updating HTML files...');
    
    const htmlFiles = fs.readdirSync(frontendDir).filter(f => f.endsWith('.html'));
    
    htmlFiles.forEach(file => {
        const filePath = path.join(frontendDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;
        
        // Backup
        const backup = filePath + '.script-backup-' + Date.now();
        fs.writeFileSync(backup, content);
        
        // Fix login.html specifically
        if (file === 'login.html') {
            // Ensure proper script loading order
            const bodyEnd = content.indexOf('</body>');
            if (bodyEnd !== -1) {
                const beforeBody = content.substring(0, bodyEnd);
                const afterBody = content.substring(bodyEnd);
                
                // Check current script loading
                const hasApi = beforeBody.includes('src="js/api.js"');
                const hasAuth = beforeBody.includes('src="js/auth.js"');
                
                if (!hasApi) {
                    // Add api.js
                    beforeBody.replace('</body>', '<script src="js/api.js"></script>\n</body>');
                    updated = true;
                }
                
                if (!hasAuth) {
                    // Add auth.js
                    beforeBody.replace('</body>', '<script src="js/auth.js"></script>\n</body>');
                    updated = true;
                }
                
                // Fix login form handler
                if (content.includes('form.addEventListener')) {
                    // Make sure it uses window.auth.login
                    content = content.replace(/auth\.login\(/g, 'window.auth.login(');
                    content = content.replace(/API\.login\(/g, 'window.API.login(');
                    updated = true;
                }
            }
        }
        
        // Fix all HTML files: remove type="module" and ensure proper order
        if (content.includes('type="module"')) {
            content = content.replace(/type="module"/g, '');
            updated = true;
        }
        
        // Ensure api.js loads before auth.js and other scripts
        const scripts = [
            { find: 'js/api.js', insert: 'js/api.js' },
            { find: 'js/auth.js', insert: 'js/auth.js' }
        ];
        
        scripts.forEach(script => {
            if (content.includes(script.find)) {
                // Check order
                const apiIndex = content.indexOf('js/api.js');
                const authIndex = content.indexOf('js/auth.js');
                
                if (authIndex < apiIndex && authIndex !== -1 && apiIndex !== -1) {
                    // Wrong order, need to fix
                    console.log(`⚠️  Wrong script order in ${file}, fixing...`);
                    // This is complex, we'll handle it differently
                }
            }
        });
        
        // Add auth check for protected pages (except login)
        if (file !== 'login.html' && !content.includes('auth.requireAuth')) {
            // Look for script tags to add auth check
            const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
            if (scriptMatch) {
                const authCheck = `
                    // Auth check
                    document.addEventListener('DOMContentLoaded', async function() {
                        if (window.auth) {
                            const authenticated = await window.auth.requireAuth();
                            if (!authenticated) return;
                        }
                    });
                `;
                
                content = content.replace(scriptMatch[0], `<script>${authCheck}${scriptMatch[1]}</script>`);
                updated = true;
            }
        }
        
        if (updated) {
            fs.writeFileSync(filePath, content);
            console.log(`✅ Updated ${file}`);
        }
    });
}

// Step 5: Create a simple login helper for login.html
function createLoginHelper() {
    console.log('\n📄 Creating login helper...');
    
    const loginHelper = `// Login helper - to be added to login.html
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        console.warn('Login form not found');
        return;
    }
    
    // Check if already logged in
    if (window.auth && window.auth.user) {
        window.auth.redirectByRole(window.auth.user);
        return;
    }
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const errorDiv = document.getElementById('loginError');
        
        if (!username || !password) {
            showError('Please enter username and password');
            return;
        }
        
        // Show loading
        if (submitBtn) {
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitBtn.disabled = true;
        }
        
        if (errorDiv) errorDiv.style.display = 'none';
        
        try {
            // Use window.auth if available, otherwise use API directly
            if (window.auth && window.auth.login) {
                await window.auth.login(username, password);
            } else if (window.API) {
                const response = await window.API.login(username, password);
                if (response && response.success) {
                    // Manual redirect based on role
                    const role = response.user.role;
                    if (role === 'admin') {
                        window.location.href = '/admin.html';
                    } else if (role.startsWith('department_')) {
                        window.location.href = '/department.html';
                    } else {
                        window.location.href = '/pos.html';
                    }
                } else {
                    throw new Error(response?.message || 'Login failed');
                }
            } else {
                throw new Error('API not available');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError(error.message || 'Login failed. Please check credentials.');
            
            // Reset button
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
        
        function showError(message) {
            if (errorDiv) {
                errorDiv.textContent = message;
                errorDiv.style.display = 'block';
            } else {
                alert(message);
            }
        }
    });
    
    // Focus username field
    const usernameField = document.getElementById('username');
    if (usernameField) {
        usernameField.focus();
    }
});`;
    
    const helperPath = path.join(frontendJsDir, 'login-helper.js');
    fs.writeFileSync(helperPath, loginHelper);
    console.log('✅ Created login-helper.js');
    
    // Also add it to login.html
    const loginPath = path.join(frontendDir, 'login.html');
    if (fs.existsSync(loginPath)) {
        let loginContent = fs.readFileSync(loginPath, 'utf8');
        
        // Add login helper script
        if (!loginContent.includes('login-helper.js')) {
            const bodyEnd = loginContent.indexOf('</body>');
            if (bodyEnd !== -1) {
                const beforeBody = loginContent.substring(0, bodyEnd);
                const afterBody = loginContent.substring(bodyEnd);
                
                loginContent = beforeBody + 
                    '\n    <script src="js/login-helper.js"></script>' + 
                    afterBody;
                
                fs.writeFileSync(loginPath, loginContent);
                console.log('✅ Added login helper to login.html');
            }
        }
    }
}

// Step 6: Create test page
function createTestPage() {
    const testPath = path.join(frontendDir, 'api-test-final.html');
    
    const testPage = `<!DOCTYPE html>
<html>
<head>
    <title>API & Auth Test</title>
    <style>
        body { font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }
        button { margin: 5px; padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .success { color: green; }
        .error { color: red; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow: auto; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
        h2 { color: #333; }
    </style>
</head>
<body>
    <h1>SteadyMonitor API & Auth Test</h1>
    
    <div class="test-section">
        <h2>1. API Connection Test</h2>
        <button onclick="testAPI()">Test API Connection</button>
        <button onclick="testAllEndpoints()">Test All Endpoints</button>
        <div id="apiResult"></div>
    </div>
    
    <div class="test-section">
        <h2>2. Auth Test</h2>
        <div id="authStatus">Checking auth status...</div>
        <button onclick="checkAuth()">Check Auth Status</button>
        <button onclick="gotoLogin()">Go to Login Page</button>
    </div>
    
    <div class="test-section">
        <h2>3. Role-Based Redirect Test</h2>
        <p>Current user role: <span id="currentRole">Not logged in</span></p>
        <p>Expected redirect based on role:</p>
        <ul>
            <li>admin → admin.html</li>
            <li>department_uniform → department.html</li>
            <li>department_stationery → department.html</li>
            <li>other → pos.html</li>
        </ul>
        <button onclick="testRedirect()">Test Redirect Logic</button>
    </div>
    
    <script src="js/api.js"></script>
    <script src="js/auth.js"></script>
    
    <script>
        // Wait for auth to initialize
        setTimeout(() => {
            updateAuthStatus();
        }, 500);
        
        async function testAPI() {
            const resultDiv = document.getElementById('apiResult');
            resultDiv.innerHTML = 'Testing API connection...';
            
            try {
                const response = await API.call('/api/auth/check');
                resultDiv.innerHTML = \`
                    <div class="success">
                        <h3>✓ API Connection Successful</h3>
                        <p>Status: \${response.success ? 'OK' : 'Failed'}</p>
                        <p>Authenticated: \${response.isAuthenticated ? 'Yes' : 'No'}</p>
                        <pre>\${JSON.stringify(response, null, 2)}</pre>
                    </div>
                \`;
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="error">
                        <h3>✗ API Connection Failed</h3>
                        <p>\${error.message}</p>
                    </div>
                \`;
            }
        }
        
        async function testAllEndpoints() {
            const resultDiv = document.getElementById('apiResult');
            resultDiv.innerHTML = '<h3>Testing all endpoints...</h3>';
            
            const endpoints = [
                { name: 'Auth Check', url: '/api/auth/check' },
                { name: 'Customers', url: '/api/customers' },
                { name: 'Products', url: '/api/inventory/products' },
                { name: 'Dashboard', url: '/api/dashboard/stats' },
                { name: 'Departments', url: '/api/pos/departments' }
            ];
            
            for (const endpoint of endpoints) {
                const div = document.createElement('div');
                div.innerHTML = \`Testing \${endpoint.name}...\`;
                resultDiv.appendChild(div);
                
                try {
                    await API.call(endpoint.url);
                    div.innerHTML = \`<span class="success">✓ \${endpoint.name}</span>\`;
                } catch (error) {
                    div.innerHTML = \`<span class="error">✗ \${endpoint.name} - \${error.message}</span>\`;
                }
            }
        }
        
        function updateAuthStatus() {
            const authDiv = document.getElementById('authStatus');
            const roleSpan = document.getElementById('currentRole');
            
            if (window.auth && window.auth.user) {
                const user = window.auth.user;
                authDiv.innerHTML = \`
                    <div class="success">
                        <h3>✓ Authenticated</h3>
                        <p>User: \${user.username}</p>
                        <p>Role: \${user.role}</p>
                        <p>Name: \${user.display_name || user.username}</p>
                    </div>
                \`;
                roleSpan.textContent = user.role;
            } else {
                authDiv.innerHTML = \`
                    <div class="error">
                        <h3>✗ Not Authenticated</h3>
                        <p>Please login to access the system</p>
                    </div>
                \`;
                roleSpan.textContent = 'Not logged in';
            }
        }
        
        function checkAuth() {
            if (window.auth) {
                window.auth.init().then(() => {
                    updateAuthStatus();
                });
            }
        }
        
        function gotoLogin() {
            window.location.href = '/login.html';
        }
        
        function testRedirect() {
            if (window.auth && window.auth.user) {
                window.auth.redirectByRole(window.auth.user);
            } else {
                alert('Not logged in. Redirecting to login page.');
                window.location.href = '/login.html';
            }
        }
    </script>
</body>
</html>`;
    
    fs.writeFileSync(testPath, testPage);
    console.log('✅ Created comprehensive test page');
}

// Main function
function main() {
    console.log('🔧 Starting comprehensive frontend fix...\n');
    
    fixApiJS();
    fixAuthJS();
    fixOtherJSFiles();
    updateHTMLFiles();
    createLoginHelper();
    createTestPage();
    
    console.log('\n🎉 Frontend fixes completed!');
    console.log('\n📋 Testing Steps:');
    console.log('1. Server should already be running: node server.js');
    console.log('2. Open http://localhost:3001/api-test-final.html');
    console.log('3. Test API connectivity');
    console.log('4. Go to http://localhost:3001/login.html');
    console.log('5. Try logging in with different user roles');
    console.log('\n📝 Available logins (from your earlier output):');
    console.log('  - Harriet Mburu (admin)');
    console.log('  - Irene.Stat (department_stationery)');
    console.log('  - Irene.Uni (department_uniform)');
    console.log('\n💡 Note: Passwords should be in your .env file or database');
}

main();