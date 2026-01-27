// tools/audit-communication.js
const fs = require('fs');
const path = require('path');

const FRONTEND_JS = path.join(__dirname, '../frontend/js');
const FRONTEND_HTML = path.join(__dirname, '../frontend');
const BACKEND_ROUTES = path.join(__dirname, '../backend/routes');
const BACKEND_SERVICES = path.join(__dirname, '../backend/services');

function readFiles(dir, ext) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(ext))
    .map(f => ({
      name: f,
      content: fs.readFileSync(path.join(dir, f), 'utf8')
    }));
}

// 1️⃣ Collect frontend API calls
const jsFiles = readFiles(FRONTEND_JS, '.js');
const apiCalls = [];

jsFiles.forEach(f => {
  const matches = f.content.match(/\/api\/[a-zA-Z0-9/_-]+/g) || [];
  matches.forEach(m => apiCalls.push({ file: f.name, endpoint: m }));
});

// 2️⃣ Collect backend routes
const routeFiles = readFiles(BACKEND_ROUTES, '.js');
const backendEndpoints = [];

routeFiles.forEach(f => {
  const matches = f.content.match(/router\.(get|post|put|delete)\(['"`](.*?)['"`]/g) || [];
  matches.forEach(m => {
    const pathMatch = m.match(/['"`](.*?)['"`]/);
    if (pathMatch) {
      backendEndpoints.push({
        file: f.name,
        endpoint: '/api' + pathMatch[1]
      });
    }
  });
});

// 3️⃣ HTML → JS linkage check
const htmlFiles = readFiles(FRONTEND_HTML, '.html');
const missingJSLinks = [];

jsFiles.forEach(js => {
  const used = htmlFiles.some(h => h.content.includes(`js/${js.name}`));
  if (!used) missingJSLinks.push(js.name);
});

// OUTPUT
console.log('\n=== FRONTEND API CALLS ===');
apiCalls.forEach(a => console.log(`${a.file} → ${a.endpoint}`));

console.log('\n=== BACKEND ROUTES ===');
backendEndpoints.forEach(b => console.log(`${b.file} → ${b.endpoint}`));

console.log('\n=== MISSING BACKEND ENDPOINTS ===');
apiCalls.forEach(a => {
  if (!backendEndpoints.some(b => a.endpoint.startsWith(b.endpoint))) {
    console.log(`❌ ${a.file} calls missing ${a.endpoint}`);
  }
});

console.log('\n=== UNUSED BACKEND ROUTES ===');
backendEndpoints.forEach(b => {
  if (!apiCalls.some(a => a.endpoint.startsWith(b.endpoint))) {
    console.log(`⚠️ ${b.file} exposes unused ${b.endpoint}`);
  }
});

console.log('\n=== JS FILES NOT LOADED BY ANY HTML ===');
missingJSLinks.forEach(f => console.log(`❌ ${f}`));
