/**
 * final-verifier.js
 * Authoritative backend + frontend verification for SteadyMonitor
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const axios = require('axios');

//////////////////////
// CONFIG
//////////////////////

const BACKEND_PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${BACKEND_PORT}`;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const servicesDir = path.join(__dirname, 'backend/services');
const frontendDir = path.join(__dirname, 'frontend/js');

//////////////////////
// DB HELPERS
//////////////////////

async function getRealTables() {
  const res = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  return new Set(res.rows.map(r => r.table_name));
}

async function testTable(table) {
  try {
    await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
    return 'OK';
  } catch (e) {
    return e.message;
  }
}

//////////////////////
// BACKEND CHECK
//////////////////////

async function verifyBackend() {
  console.log('\n=== BACKEND (DB) VERIFICATION ===\n');

  const realTables = await getRealTables();
  const files = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(servicesDir, file), 'utf8');

    const tableRefs = [...new Set(
      [...content.matchAll(/\bT\.(\w+)\b/g)].map(m => m[1])
    )];

    console.log(`Service: ${file}`);
    if (!tableRefs.length) {
      console.log('  (no table usage)');
      continue;
    }

    for (const t of tableRefs) {
      if (!realTables.has(t)) {
        console.log(`  ${t}: ❌ NOT IN DB`);
      } else {
        const r = await testTable(t);
        console.log(`  ${t}: ${r === 'OK' ? '✅ OK' : '❌ ' + r}`);
      }
    }
    console.log('--------------------------');
  }
}

//////////////////////
// FRONTEND CHECK
//////////////////////

async function verifyFrontend() {
  console.log('\n=== FRONTEND (API) VERIFICATION ===\n');

  const files = fs.readdirSync(frontendDir).filter(f => f.endsWith('.js'));

  const apiRegex = /fetch\(\s*`?\/api\/([^`'"]+)/g;

  for (const file of files) {
    const content = fs.readFileSync(path.join(frontendDir, file), 'utf8');
    const endpoints = [...new Set(
      [...content.matchAll(apiRegex)].map(m => `/api/${m[1]}`)
    )];

    if (!endpoints.length) continue;

    console.log(`Frontend file: ${file}`);

    for (const ep of endpoints) {
      try {
        const res = await axios.get(`${BASE_URL}${ep}`);
        console.log(`  ${ep}: ✅ ${res.status}`);
      } catch (e) {
        console.log(`  ${ep}: ❌ ${e.response?.status || e.message}`);
      }
    }
    console.log('--------------------------');
  }
}

//////////////////////
// RUN
//////////////////////

(async () => {
  try {
    await verifyBackend();
    await verifyFrontend();
  } finally {
    await pool.end();
    console.log('\n=== FINAL VERIFICATION COMPLETE ===\n');
  }
})();
