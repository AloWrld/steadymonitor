#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Backend Auth for Session-Based Authentication\n');

const AUTH_ROUTES_PATH = path.join(__dirname, 'backend/routes/authRoutes.js');
const AUTH_SERVICE_PATH = path.join(__dirname, 'backend/services/authService.js');
const SERVER_PATH = path.join(__dirname, 'server.js');

// 1. Update authRoutes.js
console.log('1. Updating authRoutes.js...');
const updatedAuthRoutes = `// backend/routes/authRoutes.js - SESSION-BASED AUTH
const express = require('express');
const router = express.Router();
const AuthService = require('../services/authService');

module.exports = function(db) {
    const authService = new AuthService(db);
    
    // Login endpoint
    router.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Username and password are required' 
                });
            }
            
            const result = await authService.login(username, password);
            
            if (result.success) {
                // Store user in session
                req.session.userId = result.user.user_id;
                req.session.username = result.user.username;
                req.session.userRole = result.user.role;
                req.session.userDisplayName = result.user.display_name || result.user.username;
                req.session.department = result.user.department;
                
                console.log('✅ Session created for user:', result.user.username);
                
                res.json({
                    success: true,
                    user: result.user,
                    redirectTo: result.redirectTo
                });
            } else {
                res.status(401).json(result);
            }
        } catch (error) {
            console.error('Login route error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Server error during login' 
            });
        }
    });
    
    // Logout endpoint
    router.post('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Logout failed' 
                });
            }
            
            res.clearCookie('sid');
            res.json({ 
                success: true, 
                message: 'Logged out successfully' 
            });
        });
    });
    
    // Check auth status (USED BY FRONTEND auth.js)
    router.get('/check', (req, res) => {
        if (!req.session.userId) {
            return res.json({ 
                success: false, 
                user: null,
                isAuthenticated: false 
            });
        }
        
        const user = {
            user_id: req.session.userId,
            username: req.session.username,
            role: req.session.userRole,
            display_name: req.session.userDisplayName,
            department: req.session.department
        };
        
        res.json({
            success: true,
            user: user,
            isAuthenticated: true
        });
    });
    
    // Backward compatibility endpoint
    router.get('/verify', (req, res) => {
        if (!req.session.userId) {
            return res.json({ 
                success: false, 
                isAuthenticated: false 
            });
        }
        
        res.json({
            success: true,
            isAuthenticated: true,
            user: {
                user_id: req.session.userId,
                username: req.session.username,
                role: req.session.userRole,
                display_name: req.session.userDisplayName,
                department: req.session.department
            }
        });
    });
    
    // Get user permissions
    router.get('/permissions', (req, res) => {
        if (!req.session.userRole) {
            return res.json({ 
                success: false, 
                permissions: [] 
            });
        }
        
        const permissions = authService.getUserPermissions(req.session.userRole);
        res.json({
            success: true,
            permissions: permissions
        });
    });
    
    // Health check
    router.get('/health', (req, res) => {
        res.json({ 
            status: 'ok',
            sessionId: req.sessionID,
            userId: req.session.userId || 'none'
        });
    });
    
    return router;
};
`;

// 2. Update authService.js
console.log('2. Updating authService.js...');
const updatedAuthService = `// backend/services/authService.js - SESSION AUTH VERSION
class AuthService {
    constructor(database) {
        this.db = database;
    }

    async login(username, password) {
        try {
            console.log(\`🔐 Login attempt for: \${username}\`);
            
            const query = 'SELECT * FROM users WHERE username = $1';
            const result = await this.db.query(query, [username]);
            
            if (result.rows.length === 0) {
                console.log('❌ User not found');
                return { success: false, message: 'Invalid username or password' };
            }
            
            const user = result.rows[0];
            console.log('✅ Found user:', user.username, 'Role:', user.role);
            
            if (password === user.password) {
                console.log('✅ Password matches!');
                
                const userData = {
                    user_id: user.user_id,
                    username: user.username,
                    role: user.role,
                    display_name: user.display_name || user.username,
                    department: user.department
                };
                
                return {
                    success: true,
                    user: userData,
                    redirectTo: this.getRedirectPath(user.role)
                };
            } else {
                console.log('❌ Password mismatch');
                return { success: false, message: 'Invalid username or password' };
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            return { success: false, message: 'Login failed. Please try again.' };
        }
    }

    getRedirectPath(role) {
        switch(role) {
            case 'admin':
                return '/admin.html';
            case 'department_uniform':
            case 'department_stationery':
            default:
                return '/department.html';
        }
    }

    getUserPermissions(role) {
        const permissions = {
            admin: [
                'admin.html', 'department.html', 'payments.html', 'pos.html', 
                'refunds.html', 'pocket_money.html', 'customers.html', 'inventory.html',
                'suppliers.html', 'reports.html', 'overview.html', 'allocations.html'
            ],
            department_uniform: [
                'department.html', 'payments.html', 'pos.html', 'refunds.html', 
                'pocket_money.html', 'customers.html'
            ],
            department_stationery: [
                'department.html', 'payments.html', 'pos.html', 'refunds.html', 
                'pocket_money.html', 'customers.html'
            ]
        };
        
        return permissions[role] || permissions.department_uniform;
    }
}

module.exports = AuthService;
`;

// 3. Update server.js
console.log('3. Checking server.js for session configuration...');
let serverContent = fs.readFileSync(SERVER_PATH, 'utf8');

// Check if session middleware is already configured
if (!serverContent.includes('express-session')) {
    console.log('⚠️  Session middleware not found in server.js');
    console.log('📝 Add this to your server.js after express initialization:');
    console.log(`
// Add these imports at the top:
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

// Add this middleware before routes:
app.use(session({
    store: new pgSession({
        pool: db, // Your database pool
        tableName: 'user_sessions',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    },
    name: 'sid'
}));
    `);
} else {
    console.log('✅ Session middleware already configured');
}

// Write updated files
fs.writeFileSync(AUTH_ROUTES_PATH, updatedAuthRoutes);
fs.writeFileSync(AUTH_SERVICE_PATH, updatedAuthService);

console.log('\n✅ Backend auth updated for session-based authentication!');
console.log('\n📋 Next Steps:');
console.log('1. Install required packages:');
console.log('   npm install express-session connect-pg-simple');
console.log('');
console.log('2. Run the SQL to create session table:');
console.log('   psql -d your_database -f create-session-table.sql');
console.log('');
console.log('3. Restart your server:');
console.log('   node server.js');
console.log('');
console.log('4. Test login/logout flow');