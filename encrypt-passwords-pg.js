// encrypt-passwords-pg.js - FIXED VERSION
const crypto = require('crypto');
const { Client } = require('pg');
const fs = require('fs');

// AES-256 requires 32 bytes (256 bits)
const ENCRYPTION_KEY = 'STEADYMONITOR2026SECUREKEY12345678'; // 32 characters
const IV_LENGTH = 16;

function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    // Ensure key is exactly 32 bytes
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return 'ENCRYPTED:' + iv.toString('hex') + ':' + encrypted.toString('hex');
}

async function main() {
    // Get password from .env or use default
    const password = process.env.DB_PASSWORD || '';
    
    const client = new Client({
        host: 'localhost',
        user: 'steadyuser',
        password: password,
        database: 'steadymonitor',
        port: 5432
    });

    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL database');

        // Get all users with plain text passwords (not starting with ENCRYPTED:)
        const result = await client.query(
            "SELECT user_id, username, password FROM users WHERE password NOT LIKE 'ENCRYPTED:%'"
        );

        console.log(`Found ${result.rows.length} users to encrypt`);
        
        if (result.rows.length === 0) {
            console.log('⚠️  No users found with plain text passwords.');
            console.log('   They may already be encrypted.');
            
            // Check current state
            const checkResult = await client.query(
                "SELECT username, LEFT(password, 50) as password_preview FROM users"
            );
            console.log('\n📋 Current passwords:');
            console.table(checkResult.rows);
            return;
        }

        // Encrypt each user
        for (const user of result.rows) {
            const encrypted = encrypt(user.password);
            await client.query(
                'UPDATE users SET password = $1 WHERE user_id = $2',
                [encrypted, user.user_id]
            );
            console.log(`✅ Encrypted ${user.username}`);
        }

        console.log('\n🎉 All passwords encrypted successfully!');
        
        // Show final result
        const finalResult = await client.query(
            "SELECT username, department, LEFT(password, 50) as password_preview FROM users"
        );
        
        console.log('\n📋 Final encrypted passwords:');
        console.table(finalResult.rows);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n💡 Trying manual method...');
        
        // Show manual SQL commands with fixed encryption
        console.log('\n📝 Manual SQL commands:');
        console.log(getManualSql());
        
    } finally {
        await client.end();
    }
}

function getManualSql() {
    try {
        const passwords = {
            'Hattyjohninvestments1@2026': encrypt('Hattyjohninvestments1@2026'),
            '1437stella': encrypt('1437stella'),
            'IRENEM': encrypt('IRENEM'),
            'NkuNja': encrypt('NkuNja')
        };
        
        let sql = '-- Manual SQL to encrypt passwords\n';
        sql += `UPDATE users SET password = '${passwords['Hattyjohninvestments1@2026']}' WHERE username = 'Harriet Mburu';\n`;
        sql += `UPDATE users SET password = '${passwords['1437stella']}' WHERE username = 'Stella.Uni' AND department = 'Uniform';\n`;
        sql += `UPDATE users SET password = '${passwords['IRENEM']}' WHERE username = 'Irene.Uni' AND department = 'Uniform';\n`;
        sql += `UPDATE users SET password = '${passwords['NkuNja']}' WHERE username = 'Margaret.Uni' AND department = 'Uniform';\n`;
        sql += `UPDATE users SET password = '${passwords['1437stella']}' WHERE username = 'Stella.Stat' AND department = 'Stationery';\n`;
        sql += `UPDATE users SET password = '${passwords['IRENEM']}' WHERE username = 'Irene.Stat' AND department = 'Stationery';\n`;
        sql += `UPDATE users SET password = '${passwords['NkuNja']}' WHERE username = 'Margaret.Stat' AND department = 'Stationery';\n`;
        
        return sql;
    } catch (error) {
        return 'Error generating manual SQL: ' + error.message;
    }
}

// Install pg if needed
try {
    require('pg');
} catch (err) {
    console.log('Installing pg package...');
    const { execSync } = require('child_process');
    execSync('npm install pg', { stdio: 'inherit' });
}

// Check if password is in .env
try {
    require('dotenv').config();
} catch (err) {
    console.log('dotenv not found, using empty password');
}

main();