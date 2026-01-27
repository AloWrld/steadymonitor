/**
 * verify-master.js
 * Combined backend + frontend verification for SteadyMonitor
 * Reads DB config from .env
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config(); // Load .env

/////////////////////////
// CONFIGURATION
/////////////////////////

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  database: process.env.DB_NAME || 'steadymonitor',
  user: process.env.DB_USER || 'steadyuser',
  password: process.env.DB_PASSWORD || 'steady123',
});

const backendRoutesDir = path.join(__dirname, 'backend', 'routes');
const backendServicesDir = path.join(__dirname, 'backend', 'services');
const frontendJsDir = path.join(__dirname, 'frontend', 'js');
const backendBaseURL = `http://localhost:${process.env.PORT || 3000}`;

/////////////////////////
// HELPER FUNCTIONS
/////////////////////////

const jsFiles = (dir) => fs.readdirSync(dir).filter(f => f.endsWith('.js'));

// Extract tables from service JS files
const extractTablesFromService = (servicePath) => {
  if (!fs.existsSync(servicePath)) return [];
  const content = fs.readFileSync(servicePath, 'utf-8');
  const tableRegex = /\bFROM\s+([a-z_]+)|\bINTO\s+([a-z_]+)|\bUPDATE\s+([a-z_]+)/gi;
  const matches = [...content.matchAll(tableRegex)];
  return [...new Set(matches.map(m => m[1] || m[2] || m[3]).filter(Boolean))];
};

// Test backend table connectivity
const testRead = async (table) => {
  try {
    await pool.query(`SELECT * FROM ${table} LIMIT 1`);
    return '✅ OK';
  } catch (err) {
    return `❌ ERROR: ${err.message}`;
  }
};

// Extract frontend API calls
const extractApiCalls = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const calls = [];
  const fetchRegex = /fetch\(['"`]([^'"`]+)['"`].*?\)/g;
  const axiosRegex = /axios\.(get|post|put|delete)\(['"`]([^'"`]+)['"`](?:,\s*([^)]+))?\)/g;
  let match;
  while ((match = fetchRegex.exec(content))) calls.push({ method: 'GET', url: match[1], payload: null });
  while ((match = axiosRegex.exec(content))) calls.push({ method: match[1].toUpperCase(), url: match[2], payload: match[3] || null });
  return calls;
};

// Test frontend API call
const testApiCall = async (call) => {
  try {
    let res;
    if (call.method === 'GET' || call.method === 'DELETE') {
      res = await axios[call.method.toLowerCase()](`${backendBaseURL}${call.url}`);
    } else {
      const payload = call.payload ? eval(call.payload) : {};
      res = await axios[call.method.toLowerCase()](`${backendBaseURL}${call.url}`, payload);
    }
    return { status: res.status, success: true };
  } catch (err) {
    return { status: err.response?.status || 'N/A', success: false, error: err.message };
  }
};

/////////////////////////
// MAIN EXECUTION
/////////////////////////

(async () => {
  console.log('\n=== BACKEND VERIFICATION ===\n');

  const backendReport = [];
  const routeFiles = jsFiles(backendRoutesDir);

  for (const routeFile of routeFiles) {
    const serviceName = routeFile.replace('Routes.js', 'Service.js');
    const servicePath = path.join(backendServicesDir, serviceName);
    const tables = extractTablesFromService(servicePath);

    const tableResults = [];
    for (const table of tables) tableResults.push({ table, result: await testRead(table) });

    backendReport.push({ route: routeFile, service: fs.existsSync(servicePath) ? serviceName : 'N/A', tableResults });
  }

  backendReport.forEach(r => {
    console.log(`Route: ${r.route}`);
    console.log(`Service: ${r.service}`);
    r.tableResults.forEach(t => console.log(`  ${t.table}: ${t.result}`));
    console.log('-------------------------------');
  });

  console.log('\n=== FRONTEND API VERIFICATION ===\n');

  const frontendReport = [];
  const frontendFiles = jsFiles(frontendJsDir);

  for (const file of frontendFiles) {
    const filePath = path.join(frontendJsDir, file);
    const calls = extractApiCalls(filePath);
    for (const call of calls) {
      const result = await testApiCall(call);
      frontendReport.push({ file, ...call, ...result });
    }
  }

  frontendReport.forEach(r => {
    console.log(`File: ${r.file}`);
    console.log(`  Endpoint: ${r.url}`);
    console.log(`  Method: ${r.method}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  Success: ${r.success}`);
    if (!r.success) console.log(`  Error: ${r.error}`);
    console.log('-------------------------------');
  });

  await pool.end();
  console.log('\n=== MASTER VERIFICATION COMPLETE ===\n');
})();
