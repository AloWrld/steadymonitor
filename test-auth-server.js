// Quick test server to verify auth flow
const express = require('express');
const session = require('express-session');

const app = express();
app.use(express.json());

// Mock session middleware for testing
app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Mock endpoints matching your authRoutes
app.post('/api/auth/login', (req, res) => {
    req.session.userId = 1;
    req.session.username = 'testuser';
    req.session.userRole = 'admin';
    res.json({ success: true, user: { user_id: 1, username: 'testuser', role: 'admin' } });
});

app.get('/api/auth/check', (req, res) => {
    if (!req.session.userId) {
        return res.json({ success: false, user: null });
    }
    res.json({ 
        success: true, 
        user: { 
            user_id: req.session.userId,
            username: req.session.username,
            role: req.session.userRole
        }
    });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

// Test middleware
const { requireAuth } = require('./backend/middleware/authMiddleware');
app.get('/api/test-auth', requireAuth, (req, res) => {
    res.json({ success: true, user: req.user });
});

app.listen(3002, () => {
    console.log('Test server running on http://localhost:3002');
    console.log('Test with: curl -X POST http://localhost:3002/api/auth/login');
    console.log('Then: curl -X GET http://localhost:3002/api/test-auth');
});
