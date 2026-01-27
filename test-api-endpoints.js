// test-api-windows.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const endpoints = [
    '/api/auth/check',
    '/api/dashboard/stats',
    '/api/pos/products/department/Stationery',
    '/api/customers',
    '/api/products'
];

function testEndpoint(endpoint) {
    return new Promise((resolve) => {
        const req = http.get(`${BASE_URL}${endpoint}`, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        endpoint,
                        status: res.statusCode,
                        success: jsonData.success || false,
                        message: jsonData.message || 'No message',
                        data: jsonData
                    });
                } catch {
                    resolve({
                        endpoint,
                        status: res.statusCode,
                        success: false,
                        message: 'Invalid JSON response',
                        data: null
                    });
                }
            });
        });
        
        req.on('error', (err) => {
            resolve({
                endpoint,
                status: 0,
                success: false,
                message: err.message,
                data: null
            });
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            resolve({
                endpoint,
                status: 0,
                success: false,
                message: 'Timeout after 5 seconds',
                data: null
            });
        });
    });
}

async function testAllEndpoints() {
    console.log('🧪 Testing API Endpoints...\n');
    
    const results = [];
    
    for (const endpoint of endpoints) {
        console.log(`Testing: ${endpoint}`);
        const result = await testEndpoint(endpoint);
        results.push(result);
        
        const status = result.status === 200 ? '✅' : '❌';
        console.log(`${status} Status: ${result.status}`);
        console.log(`   Success: ${result.success ? 'Yes' : 'No'}`);
        console.log(`   Message: ${result.message}`);
        
        if (result.data) {
            if (Array.isArray(result.data)) {
                console.log(`   Items: ${result.data.length}`);
            } else if (result.data.products) {
                console.log(`   Products: ${result.data.products.length}`);
            } else if (result.data.customers) {
                console.log(`   Customers: ${result.data.customers.length}`);
            }
        }
        console.log('');
    }
    
    // Generate report
    const report = `# API Endpoint Test Report
Generated: ${new Date().toISOString()}

## Summary
Total Endpoints Tested: ${endpoints.length}
Successful (200 OK): ${results.filter(r => r.status === 200).length}
Failed: ${results.filter(r => r.status !== 200).length}

## Results
${results.map(r => `
### ${r.endpoint}
- Status: ${r.status}
- Success: ${r.success ? '✅ Yes' : '❌ No'}
- Message: ${r.message}
${r.data ? '- Has Data: Yes' : '- Has Data: No'}
`).join('')}

## Recommendations
${results.filter(r => !r.success || r.status !== 200).length > 0 ? `
1. Check if server is running: \`npm start\`
2. Verify database connection in .env
3. Check route handlers exist in backend/routes/
4. Look at server console for errors
` : '✅ All endpoints are working correctly!'}

## Server Status
- Server running: ${results.some(r => r.status > 0) ? '✅ Yes' : '❌ No'}
- Database responding: ${results.some(r => r.success) ? '✅ Yes' : '❌ No'}
`;

    fs.writeFileSync('API_TEST_REPORT_WINDOWS.md', report);
    console.log('📄 Report saved to API_TEST_REPORT_WINDOWS.md');
    
    return results;
}

// Run tests
testAllEndpoints().catch(console.error);