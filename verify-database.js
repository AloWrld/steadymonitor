#!/usr/bin/env node
/**
 * Verify Database and Products
 */

const { Pool } = require('pg');
require('dotenv').config();

async function verifyDatabase() {
    console.log('🔍 Verifying Database Setup...\n');
    
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
        console.log('\n2. Checking products table...');
        const productsExist = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'products'
            );
        `);
        
        if (productsExist.rows[0].exists) {
            console.log('   ✅ Products table exists');
            
            // Count products
            const productCount = await client.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN active = true THEN 1 END) as active,
                    COUNT(CASE WHEN department = 'Uniform' THEN 1 END) as uniform,
                    COUNT(CASE WHEN department = 'Stationery' THEN 1 END) as stationery
                FROM products;
            `);
            
            const stats = productCount.rows[0];
            console.log(`   📊 Total products: ${stats.total}`);
            console.log(`   ✅ Active products: ${stats.active}`);
            console.log(`   👕 Uniform products: ${stats.uniform}`);
            console.log(`   📝 Stationery products: ${stats.stationery}`);
            
            // Show some sample products
            if (stats.active > 0) {
                const sample = await client.query(`
                    SELECT product_id, name, sku, department, category, sell_price, stock_qty 
                    FROM products 
                    WHERE active = true 
                    LIMIT 5
                `);
                
                console.log('\n3. Sample Active Products:');
                sample.rows.forEach((p, i) => {
                    console.log(`   ${i+1}. ${p.name} (${p.department})`);
                    console.log(`      SKU: ${p.sku || 'N/A'}, Price: KES ${p.sell_price}, Stock: ${p.stock_qty}\n`);
                });
            } else {
                console.log('\n❌ No active products found!');
                console.log('   Run this SQL to add sample products:');
                console.log(`   INSERT INTO products (name, sku, department, category, buy_price, sell_price, stock_qty, reorder_level, active) VALUES`);
                console.log(`     ('School Uniform', 'UNI-001', 'Uniform', 'Clothing', 500, 800, 50, 10, true),`);
                console.log(`     ('Exercise Book', 'STAT-001', 'Stationery', 'Books', 30, 50, 200, 20, true),`);
                console.log(`     ('Pen', 'STAT-002', 'Stationery', 'Writing', 10, 20, 500, 50, true);`);
            }
        } else {
            console.log('❌ Products table does NOT exist!');
            console.log('   Run the schema.sql file to create tables.');
        }
        
        // 3. Check users table
        console.log('\n4. Checking users table...');
        const usersExist = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);
        
        if (usersExist.rows[0].exists) {
            const userCount = await client.query("SELECT COUNT(*) as total FROM users");
            console.log(`   ✅ Users table exists with ${userCount.rows[0].total} users`);
            
            // List users
            const users = await client.query(`
                SELECT username, role, department, password 
                FROM users 
                ORDER BY role, username
            `);
            
            console.log('\n5. User Accounts:');
            users.rows.forEach(user => {
                console.log(`   👤 ${user.username.padEnd(15)} (${user.role})`);
                console.log(`      Department: ${user.department || 'N/A'}`);
                console.log(`      Password: ${user.password}\n`);
            });
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('1. Check if PostgreSQL is running');
        console.log('2. Check .env file has correct database credentials');
        console.log('3. Run: sudo service postgresql start (Linux)');
        console.log('   or: net start postgresql (Windows)');
    } finally {
        await pool.end();
    }
}

verifyDatabase();