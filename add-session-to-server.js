#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SERVER_PATH = path.join(__dirname, 'server.js');
let content = fs.readFileSync(SERVER_PATH, 'utf8');

console.log('🔧 Checking server.js for session middleware...\n');

// Check if session middleware exists
if (!content.includes('express-session')) {
    console.log('⚠️  Adding session middleware to server.js...');
    
    // Add imports at the top
    const importSection = `const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');`;
    
    const importsWithSession = `const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);`;
    
    content = content.replace(importSection, importsWithSession);
    
    // Add session middleware after cookieParser
    const cookieParserLine = `app.use(cookieParser());`;
    const withSession = `app.use(cookieParser());

// ==================== SESSION MIDDLEWARE ====================
const { getPool } = require('./backend/config/database');
app.use(session({
    store: new pgSession({
        pool: getPool(),
        tableName: 'user_sessions',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'steadymonitor-production-secret',
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
// ==================== END SESSION MIDDLEWARE ====================`;
    
    content = content.replace(cookieParserLine, withSession);
    
    fs.writeFileSync(SERVER_PATH, content);
    console.log('✅ Session middleware added to server.js');
} else {
    console.log('✅ Session middleware already exists in server.js');
}

console.log('\n🔍 Quick check of server.js:');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('session') || line.includes('Session')) {
        console.log(`   Line ${i+1}: ${line.trim().substring(0, 80)}`);
    }
});