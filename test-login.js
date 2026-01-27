#!/usr/bin/env node
/**
 * Test Login and POS Access
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

async function testLogin() {
    console.log('🔐 Testing login flow...\n');
    
    // 1. Try to access POS without login
    console.log('1. Testing unauthenticated access to /api/pos/products/department/Stationery');
    try {
        const req = http.get(`${BASE_URL}/api/pos/products/department/Stationery`, (res) => {
            console.log(`   Status: ${res.statusCode}`);
            if (res.statusCode === 401) {
                console.log('   ✅ Correctly blocked (needs login)');
            }
        });
        req.on('error', () => console.log('   ❌ Connection failed'));
    } catch (err) {
        console.log('   ❌ Error:', err.message);
    }
    
    // 2. Test auth check endpoint
    console.log('\n2. Testing auth check endpoint');
    try {
        const req = http.get(`${BASE_URL}/api/auth/check`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Success: ${json.success}`);
                    console.log(`   Message: ${json.message}`);
                } catch {
                    console.log('   ❌ Invalid JSON response');
                }
            });
        });
        req.on('error', (err) => console.log(`   ❌ Error: ${err.message}`));
    } catch (err) {
        console.log('   ❌ Error:', err.message);
    }
    
    // 3. Test server health
    console.log('\n3. Testing server health');
    try {
        const req = http.get(BASE_URL, (res) => {
            console.log(`   Status: ${res.statusCode}`);
            console.log(`   Server is running!`);
        });
        req.on('error', (err) => console.log(`   ❌ Server not running: ${err.message}`));
    } catch (err) {
        console.log('   ❌ Error:', err.message);
    }
    
    console.log('\n💡 Instructions:');
    console.log('1. Make sure server is running: npm start');
    console.log('2. Open browser to: http://localhost:3001/login.html');
    console.log('3. Login with:');
    console.log('   - Admin: Harriet Mburu / Hattyjohninvestments1@2026');
    console.log('   - Uniform: Stella.Uni / 1437stella');
    console.log('4. Then go to: http://localhost:3001/pos.html');
}

testLogin();