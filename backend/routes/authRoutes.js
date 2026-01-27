// backend/routes/authRoutes.js - SESSION-BASED AUTH
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

