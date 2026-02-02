// backend/middleware/authMiddleware.js - SESSION-BASED ONLY
const AuthService = require('../services/authService');

// Simple authentication middleware - SESSION-BASED
function requireAuth(req, res, next) {
    try {
        // Check session
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. Please login.' 
            });
        }
        
        // Attach user from session
        req.user = {
            user_id: req.session.userId,
            username: req.session.username,
            role: req.session.userRole,
            display_name: req.session.userDisplayName || req.session.username,
            department: req.session.department
        };
        
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Authentication error.' 
        });
    }
}

// Page access middleware - SESSION-BASED
function pageAccessMiddleware(db) {
    const authService = new AuthService(db);
    
    return async (req, res, next) => {
        try {
            const page = req.path.replace('/', '').replace('.html', '') + '.html';
            
            // Check session
            if (!req.session || !req.session.userId) {
                if (req.accepts('html')) {
                    return res.redirect('/login.html');
                }
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }
            
            // Get user from session
            const userData = {
                user_id: req.session.userId,
                username: req.session.username,
                role: req.session.userRole,
                display_name: req.session.userDisplayName || req.session.username,
                department: req.session.department
            };
            
            // Check page access
            if (!authService.canAccessPage(userData.role, page)) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Access denied to this page.' 
                });
            }
            
            req.user = userData;
            next();
        } catch (error) {
            console.error('Page access error:', error);
            if (req.accepts('html')) {
                return res.redirect('/login.html');
            }
            return res.status(500).json({ success: false, message: 'Server error' });
        }
    };
}

// Permission middleware - SESSION-BASED
function requirePermission(permission) {
    return (req, res, next) => {
        try {
            // Check session
            if (!req.session || !req.session.userId) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Authentication required' 
                });
            }

            const userRole = req.session.userRole;
            const userDepartment = req.session.department|| '';

            const requestedDepartment = req.params.department || req.body.department;

            // Permission matrix
            const permissions = {
                admin: ['pos', 'inventory', 'reports', 'overview', 'refunds', 'allocations', 'admin', 'customers', 'suppliers', 'payments'],
                department_uniform: ['pos', 'department', 'payments', 'refunds', 'pocket_money', 'allocations'],
                department_stationery: ['pos', 'department', 'payments', 'refunds', 'pocket_money', 'allocations'],
            };

            // Check permission
            if (!permissions[userRole] || !permissions[userRole].includes(permission)) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Insufficient permissions for this action' 
                });
            }

            // Department check for POS
            if (permission === 'pos' && requestedDepartment) {
                if (userRole !== 'admin' && userDepartment !== requestedDepartment) {
                    return res.status(403).json({ 
                        success: false, 
                        message: 'Access denied. You can only access ' + userDepartment + ' department.' 
                    });
                }
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Permission validation error' 
            });
        }
    };
}

// Legacy middleware (session-based)
function authMiddleware(db) {
    return async (req, res, next) => {
        try {
            // Check session
            if (!req.session || !req.session.userId) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Access denied. Please login.' 
                });
            }
            
            // Attach user from session
            req.user = {
                user_id: req.session.userId,
                username: req.session.username,
                role: req.session.userRole,
                display_name: req.session.userDisplayName || req.session.username,
                department: req.session.department
            };
            
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Authentication error.' 
            });
        }
    };
}

module.exports = { authMiddleware, pageAccessMiddleware, requirePermission, requireAuth };
