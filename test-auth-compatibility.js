#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Auth Compatibility Between Files...\n');

const PROJECT_ROOT = process.cwd();
const BACKEND_DIR = path.join(PROJECT_ROOT, 'backend');

// Files to check
const FILES_TO_CHECK = {
    'authMiddleware.js': path.join(BACKEND_DIR, 'middleware/authMiddleware.js'),
    'authRoutes.js': path.join(BACKEND_DIR, 'routes/authRoutes.js'),
    'authService.js': path.join(BACKEND_DIR, 'services/authService.js'),
    'server.js': path.join(PROJECT_ROOT, 'server.js')
};

// Check if files exist
console.log('📁 Checking file existence:');
Object.entries(FILES_TO_CHECK).forEach(([name, path]) => {
    const exists = fs.existsSync(path);
    console.log(`${exists ? '✅' : '❌'} ${name}`);
});

console.log('\n🔍 Analyzing current auth patterns...\n');

// Read and analyze files
const analyses = {};

Object.entries(FILES_TO_CHECK).forEach(([name, filePath]) => {
    if (!fs.existsSync(filePath)) {
        analyses[name] = { error: 'File not found' };
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    analyses[name] = {
        usesTokens: content.includes('token') || content.includes('Token'),
        usesSessions: content.includes('session') || content.includes('Session'),
        usesCookies: content.includes('cookie') || content.includes('Cookie'),
        usesJWT: content.includes('verifyToken') || content.includes('generateToken'),
        usesSessionVars: content.includes('req.session') || content.includes('session.user'),
        lines: lines.length
    };
});

// Display analysis
console.log('📊 CURRENT AUTH PATTERNS:');
console.log('='.repeat(80));

Object.entries(analyses).forEach(([name, analysis]) => {
    if (analysis.error) {
        console.log(`\n❌ ${name}: ${analysis.error}`);
        return;
    }
    
    console.log(`\n📄 ${name} (${analysis.lines} lines):`);
    console.log(`   🪪 Uses Tokens: ${analysis.usesTokens ? 'YES' : 'no'}`);
    console.log(`   🍪 Uses Sessions: ${analysis.usesSessions ? 'YES' : 'no'}`);
    console.log(`   🍪 Uses Cookies: ${analysis.usesCookies ? 'YES' : 'no'}`);
    console.log(`   🔐 Uses JWT: ${analysis.usesJWT ? 'YES' : 'no'}`);
    console.log(`   👤 Uses req.session: ${analysis.usesSessionVars ? 'YES' : 'no'}`);
});

// Check compatibility
console.log('\n⚡ COMPATIBILITY CHECK:');
console.log('='.repeat(80));

const middleware = analyses['authMiddleware.js'];
const routes = analyses['authRoutes.js'];
const service = analyses['authService.js'];
const server = analyses['server.js'];

// Check 1: Does middleware expect what routes provide?
if (middleware.usesJWT && !routes.usesJWT) {
    console.log('⚠️  MISMATCH: Middleware expects JWT but routes may not provide it');
}

if (!middleware.usesSessionVars && routes.usesSessions) {
    console.log('⚠️  MISMATCH: Routes use sessions but middleware doesn\'t check them');
}

// Check 2: Does authService match authRoutes?
if (service.usesJWT && !routes.usesJWT) {
    console.log('⚠️  MISMATCH: authService has JWT but routes don\'t use it');
}

// Check 3: Is server configured for sessions?
if (!server.usesSessions && (routes.usesSessions || middleware.usesSessions)) {
    console.log('⚠️  MISMATCH: Files use sessions but server.js may not be configured');
}

// Show what needs to change
console.log('\n🎯 RECOMMENDED CHANGES:');
console.log('='.repeat(80));

if (middleware.usesJWT && routes.usesSessions) {
    console.log('1️⃣  UPDATE authMiddleware.js to check req.session instead of tokens');
    console.log('   Change: verifyToken(token) → check req.session.userId');
}

if (service.usesJWT && routes.usesSessions) {
    console.log('2️⃣  UPDATE authService.js (optional) - remove verifyToken if not used');
}

if (!server.usesSessions && routes.usesSessions) {
    console.log('3️⃣  ADD session middleware to server.js');
    console.log('   Add: express-session and connect-pg-simple middleware');
}

// Test endpoints
console.log('\n🧪 TEST ENDPOINTS (run these after server start):');
console.log('='.repeat(80));

const testCommands = [
    'curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d \'{"username":"test","password":"test"}\'',
    'curl -X GET http://localhost:3000/api/auth/check',
    'curl -X POST http://localhost:3000/api/auth/logout',
    'curl -X GET http://localhost:3000/api/dashboard/stats',
];

testCommands.forEach((cmd, i) => {
    console.log(`Test ${i+1}: ${cmd}`);
});

console.log('\n📝 QUICK DIAGNOSIS:');
if (routes.usesSessions && !middleware.usesSessionVars) {
    console.log('❌ INCOMPATIBLE: Routes use sessions but middleware checks tokens');
    console.log('💡 Solution: Update authMiddleware.js to check sessions');
} else if (middleware.usesSessionVars && routes.usesSessions) {
    console.log('✅ COMPATIBLE: Both use sessions');
} else if (middleware.usesJWT && routes.usesJWT) {
    console.log('✅ COMPATIBLE: Both use JWT tokens');
} else {
    console.log('⚠️  MIXED: Some files use sessions, some use tokens');
}

// Generate a simple test server
console.log('\n🚀 QUICK TEST SERVER SCRIPT:');
console.log('='.repeat(80));

const testServerScript = `// Quick test server to verify auth flow
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
`;

console.log(testServerScript);

// Save test server
const testServerPath = path.join(PROJECT_ROOT, 'test-auth-server.js');
fs.writeFileSync(testServerPath, testServerScript);
console.log(`\n📁 Test server saved to: ${testServerPath}`);
console.log('Run: node test-auth-server.js');