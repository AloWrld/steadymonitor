// fix-all-issues.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing ALL project issues...\n');

// 1. Fix database.js
console.log('1. Fixing database.js...');
const dbConfigPath = path.join(__dirname, 'backend/config/database.js');
if (fs.existsSync(dbConfigPath)) {
    let content = fs.readFileSync(dbConfigPath, 'utf8');
    
    // Replace the pool initialization
    const newPoolConfig = `const { Pool } = require('pg');
require('dotenv').config();

// Use either connection string or individual parameters
let pool;
if (process.env.DATABASE_URL) {
  // Use connection string (Render/Railway style)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  // Use individual parameters (localhost)
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'steadymonitor',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
  });
}

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});`;
    
    // Find and replace the pool initialization section
    const lines = content.split('\n');
    const poolStart = lines.findIndex(line => line.includes('const pool = new Pool'));
    const poolEnd = lines.findIndex((line, idx) => idx > poolStart && line.includes('// Test the connection'));
    
    if (poolStart !== -1 && poolEnd !== -1) {
        lines.splice(poolStart, poolEnd - poolStart, ...newPoolConfig.split('\n'));
        content = lines.join('\n');
        fs.writeFileSync(dbConfigPath, content);
        console.log('   ✅ Updated database.js');
    } else {
        console.log('   ❌ Could not find pool configuration to replace');
    }
}

// 2. Add departments route to posRoutes.js
console.log('\n2. Adding departments route to posRoutes.js...');
const posRoutesPath = path.join(__dirname, 'backend/routes/posRoutes.js');
if (fs.existsSync(posRoutesPath)) {
    let content = fs.readFileSync(posRoutesPath, 'utf8');
    
    // Check if departments route already exists
    if (!content.includes('/departments')) {
        // Find where to insert (before debug routes)
        const debugIndex = content.indexOf('router.get(\'/debug/calls\'');
        
        if (debugIndex !== -1) {
            const departmentsRoute = `
/**
 * 11. GET DEPARTMENTS FOR DROPDOWN
 * Route: GET /api/pos/departments
 * Access: Any logged-in user
 */
router.get('/departments', requireAuth, async (req, res) => {
    try {
        // Return hardcoded departments since your system uses Uniform/Stationery
        const departments = [
            { id: 'Uniform', name: 'Uniform Department' },
            { id: 'Stationery', name: 'Stationery Department' }
        ];
        
        res.json({ 
            success: true, 
            departments: departments
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch departments',
            error: error.message 
        });
    }
});
`;
            
            content = content.slice(0, debugIndex) + departmentsRoute + content.slice(debugIndex);
            fs.writeFileSync(posRoutesPath, content);
            console.log('   ✅ Added departments route');
        } else {
            console.log('   ❌ Could not find debug route to insert before');
        }
    } else {
        console.log('   ✅ Departments route already exists');
    }
}

// 3. Fix pos.js frontend file
console.log('\n3. Fixing frontend pos.js...');
const posJsPath = path.join(__dirname, 'frontend/js/pos.js');
if (fs.existsSync(posJsPath)) {
    let content = fs.readFileSync(posJsPath, 'utf8');
    
    // Fix loadDepartments function
    const loadDepartmentsFunc = `
/**
 * Load departments for dropdown
 */
async function loadDepartments() {
    try {
        const response = await fetch('/api/pos/departments', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                departments = data.departments || [];
                renderDepartmentDropdown(departments);
            }
        }
    } catch (error) {
        console.error('Error loading departments:', error);
        // Set default departments
        departments = [
            { id: 'Uniform', name: 'Uniform Department' },
            { id: 'Stationery', name: 'Stationery Department' }
        ];
        renderDepartmentDropdown(departments);
    }
}`;
    
    // Replace the existing loadDepartments function
    const loadDeptStart = content.indexOf('async function loadDepartments()');
    const loadDeptEnd = content.indexOf('}', content.indexOf('}', loadDeptStart) + 1) + 1;
    
    if (loadDeptStart !== -1 && loadDeptEnd !== -1) {
        content = content.slice(0, loadDeptStart) + loadDepartmentsFunc + content.slice(loadDeptEnd);
        fs.writeFileSync(posJsPath, content);
        console.log('   ✅ Fixed loadDepartments function');
    } else {
        console.log('   ❌ Could not find loadDepartments function to replace');
    }
}

// 4. Create a test login script
console.log('\n4. Creating test login script...');
const testLoginScript = `#!/usr/bin/env node
/**
 * Test Login and POS Access
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

async function testLogin() {
    console.log('🔐 Testing login flow...\\n');
    
    // 1. Try to access POS without login
    console.log('1. Testing unauthenticated access to /api/pos/products/department/Stationery');
    try {
        const req = http.get(\`\${BASE_URL}/api/pos/products/department/Stationery\`, (res) => {
            console.log(\`   Status: \${res.statusCode}\`);
            if (res.statusCode === 401) {
                console.log('   ✅ Correctly blocked (needs login)');
            }
        });
        req.on('error', () => console.log('   ❌ Connection failed'));
    } catch (err) {
        console.log('   ❌ Error:', err.message);
    }
    
    // 2. Test auth check endpoint
    console.log('\\n2. Testing auth check endpoint');
    try {
        const req = http.get(\`\${BASE_URL}/api/auth/check\`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(\`   Status: \${res.statusCode}\`);
                    console.log(\`   Success: \${json.success}\`);
                    console.log(\`   Message: \${json.message}\`);
                } catch {
                    console.log('   ❌ Invalid JSON response');
                }
            });
        });
        req.on('error', (err) => console.log(\`   ❌ Error: \${err.message}\`));
    } catch (err) {
        console.log('   ❌ Error:', err.message);
    }
    
    // 3. Test server health
    console.log('\\n3. Testing server health');
    try {
        const req = http.get(BASE_URL, (res) => {
            console.log(\`   Status: \${res.statusCode}\`);
            console.log(\`   Server is running!\`);
        });
        req.on('error', (err) => console.log(\`   ❌ Server not running: \${err.message}\`));
    } catch (err) {
        console.log('   ❌ Error:', err.message);
    }
    
    console.log('\\n💡 Instructions:');
    console.log('1. Make sure server is running: npm start');
    console.log('2. Open browser to: http://localhost:3001/login.html');
    console.log('3. Login with:');
    console.log('   - Admin: Harriet Mburu / Hattyjohninvestments1@2026');
    console.log('   - Uniform: Stella.Uni / 1437stella');
    console.log('4. Then go to: http://localhost:3001/pos.html');
}

testLogin();`;

fs.writeFileSync('test-login.js', testLoginScript);
console.log('   ✅ Created test-login.js');

// 5. Create a database verification script
console.log('\n5. Creating database verification script...');
const dbVerifyScript = `#!/usr/bin/env node
/**
 * Verify Database and Products
 */

const { Pool } = require('pg');
require('dotenv').config();

async function verifyDatabase() {
    console.log('🔍 Verifying Database Setup...\\n');
    
    // Create pool
    let pool;
    if (process.env.DATABASE_URL) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: false
        });
    } else {
        pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'steadymonitor',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 5432,
        });
    }
    
    try {
        const client = await pool.connect();
        
        // 1. Check connection
        console.log('1. Database Connection: ✅ Connected');
        
        // 2. Check products table
        console.log('\\n2. Checking products table...');
        const productsExist = await client.query(\`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'products'
            );
        \`);
        
        if (productsExist.rows[0].exists) {
            console.log('   ✅ Products table exists');
            
            // Count products
            const productCount = await client.query(\`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN active = true THEN 1 END) as active,
                    COUNT(CASE WHEN department = 'Uniform' THEN 1 END) as uniform,
                    COUNT(CASE WHEN department = 'Stationery' THEN 1 END) as stationery
                FROM products;
            \`);
            
            const stats = productCount.rows[0];
            console.log(\`   📊 Total products: \${stats.total}\`);
            console.log(\`   ✅ Active products: \${stats.active}\`);
            console.log(\`   👕 Uniform products: \${stats.uniform}\`);
            console.log(\`   📝 Stationery products: \${stats.stationery}\`);
            
            // Show some sample products
            if (stats.active > 0) {
                const sample = await client.query(\`
                    SELECT product_id, name, sku, department, category, sell_price, stock_qty 
                    FROM products 
                    WHERE active = true 
                    LIMIT 5
                \`);
                
                console.log('\\n3. Sample Active Products:');
                sample.rows.forEach((p, i) => {
                    console.log(\`   \${i+1}. \${p.name} (\${p.department})\`);
                    console.log(\`      SKU: \${p.sku || 'N/A'}, Price: KES \${p.sell_price}, Stock: \${p.stock_qty}\\n\`);
                });
            } else {
                console.log('\\n❌ No active products found!');
                console.log('   Run this SQL to add sample products:');
                console.log(\`   INSERT INTO products (name, sku, department, category, buy_price, sell_price, stock_qty, reorder_level, active) VALUES\`);
                console.log(\`     ('School Uniform', 'UNI-001', 'Uniform', 'Clothing', 500, 800, 50, 10, true),\`);
                console.log(\`     ('Exercise Book', 'STAT-001', 'Stationery', 'Books', 30, 50, 200, 20, true),\`);
                console.log(\`     ('Pen', 'STAT-002', 'Stationery', 'Writing', 10, 20, 500, 50, true);\`);
            }
        } else {
            console.log('❌ Products table does NOT exist!');
            console.log('   Run the schema.sql file to create tables.');
        }
        
        // 3. Check users table
        console.log('\\n4. Checking users table...');
        const usersExist = await client.query(\`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        \`);
        
        if (usersExist.rows[0].exists) {
            const userCount = await client.query("SELECT COUNT(*) as total FROM users");
            console.log(\`   ✅ Users table exists with \${userCount.rows[0].total} users\`);
            
            // List users
            const users = await client.query(\`
                SELECT username, role, department, password 
                FROM users 
                ORDER BY role, username
            \`);
            
            console.log('\\n5. User Accounts:');
            users.rows.forEach(user => {
                console.log(\`   👤 \${user.username.padEnd(15)} (\${user.role})\`);
                console.log(\`      Department: \${user.department || 'N/A'}\`);
                console.log(\`      Password: \${user.password}\\n\`);
            });
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
        console.log('\\n💡 Troubleshooting:');
        console.log('1. Check if PostgreSQL is running');
        console.log('2. Check .env file has correct database credentials');
        console.log('3. Run: sudo service postgresql start (Linux)');
        console.log('   or: net start postgresql (Windows)');
    } finally {
        await pool.end();
    }
}

verifyDatabase();`;

fs.writeFileSync('verify-database.js', dbVerifyScript);
console.log('   ✅ Created verify-database.js');

// 6. Update .env file with correct variables
console.log('\n6. Updating .env file...');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Add missing variables if they don't exist
    const requiredVars = {
        'DB_USER': 'postgres',
        'DB_HOST': 'localhost',
        'DB_NAME': 'steadymonitor',
        'DB_PASSWORD': '',
        'DB_PORT': '5432',
        'SESSION_SECRET': 'your-secret-key-change-this-in-production',
        'PORT': '3001',
        'NODE_ENV': 'development'
    };
    
    let updated = false;
    Object.entries(requiredVars).forEach(([key, defaultValue]) => {
        if (!envContent.includes(`${key}=`)) {
            envContent += `\n${key}=${defaultValue}`;
            console.log(`   ✅ Added ${key}`);
            updated = true;
        }
    });
    
    if (updated) {
        fs.writeFileSync(envPath, envContent);
    } else {
        console.log('   ✅ .env file already has all required variables');
    }
} else {
    console.log('   ❌ .env file not found, creating one...');
    const defaultEnv = `# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=steadymonitor
DB_PASSWORD=
DB_PORT=5432

# Session Secret (change this!)
SESSION_SECRET=your-secret-key-change-this-in-production

# Server Port
PORT=3001

# Environment
NODE_ENV=development`;
    
    fs.writeFileSync(envPath, defaultEnv);
    console.log('   ✅ Created .env file');
}

console.log('\n✅ All fixes applied!');
console.log('\n📋 Next Steps:');
console.log('1. Run: node verify-database.js (check database setup)');
console.log('2. Run: node test-login.js (test authentication)');
console.log('3. Start server: npm start');
console.log('4. Open browser to: http://localhost:3001/login.html');
console.log('5. Login and go to POS page');
console.log('\n🔧 If still having issues, check the server console for errors.');