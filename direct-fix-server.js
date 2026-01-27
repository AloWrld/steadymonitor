
const fs = require('fs');
const path = require('path');

const SERVER_PATH = path.join(__dirname, 'server.js');
let content = fs.readFileSync(SERVER_PATH, 'utf8');

// Remove the duplicate getPool inside session middleware
// Find the session middleware section
const sessionMiddlewareStart = content.indexOf('app.use(session({');
const sessionMiddlewareEnd = content.indexOf('// ==================== END SESSION MIDDLEWARE ====================');

if (sessionMiddlewareStart !== -1 && sessionMiddlewareEnd !== -1) {
    const before = content.substring(0, sessionMiddlewareStart);
    const sessionSection = content.substring(sessionMiddlewareStart, sessionMiddlewareEnd);
    const after = content.substring(sessionMiddlewareEnd);
    
    // Remove duplicate getPool from session section
    const fixedSession = sessionSection.replace('const { getPool } = require(\'./backend/config/database\');\n', '');
    
    content = before + fixedSession + after;
    fs.writeFileSync(SERVER_PATH, content);
    console.log('✅ Removed duplicate getPool from session middleware');
} else {
    console.log('⚠️ Could not find session middleware section');
    
    // Just remove any duplicate getPool lines after the first one
    const lines = content.split('\n');
    let seenGetPool = false;
    const newLines = lines.filter(line => {
        if (line.includes('getPool') && line.includes('require')) {
            if (!seenGetPool) {
                seenGetPool = true;
                return true;
            }
            console.log('Removing duplicate:', line);
            return false;
        }
        return true;
    });
    
    fs.writeFileSync(SERVER_PATH, newLines.join('\n'));
    console.log('✅ Removed duplicate getPool imports');
}
EOF

//node direct-fix-server.js