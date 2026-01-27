// tools/test-api-alignment.js
const fetch = require('node-fetch');

async function testEndpoints() {
  const baseURL = 'http://localhost:3001';
  
  const endpoints = [
    '/api/auth/check',
    '/api/dashboard/stats',
    '/api/inventory/low-stock',
    '/api/customers',
    '/api/pos/departments'
  ];
  
  console.log('Testing API endpoints...\n');
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(baseURL + endpoint);
      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`${endpoint}: ❌ ${error.message}`);
    }
  }
}

testEndpoints();