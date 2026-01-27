// decrypt-passwords.js
const { getPool } = require('./backend/config/database');
const crypto = require('crypto');

// Use the same encryption key from your authService.js
const ENCRYPTION_KEY = 'STEADYMONITOR2026SECUREKEY1234567890!@#$%'; // 32 chars
const IV_LENGTH = 16;

function decrypt(text) {
    if (!text.startsWith('ENCRYPTED:')) return text;
    const textParts = text.split(':');
    const iv = Buffer.from(textParts[1], 'hex');
    const encryptedText = Buffer.from(textParts[2], 'hex');
    const key = Buffer.from(ENCRYPTION_KEY);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

async function decryptAllPasswords() {
    const db = getPool();
    
    try {
        console.log('🔓 Decrypting all passwords...');
        
        // Get all users with encrypted passwords
        const result = await db.query(
            "SELECT user_id, username, password FROM users WHERE password LIKE 'ENCRYPTED:%'"
        );
        
        console.log(`Found ${result.rows.length} encrypted passwords to decrypt`);
        
        for (const user of result.rows) {
            try {
                const decrypted = decrypt(user.password);
                console.log(`Decrypted ${user.username}: ${decrypted}`);
                
                // Update with plain text password
                await db.query(
                    'UPDATE users SET password = $1 WHERE user_id = $2',
                    [decrypted, user.user_id]
                );
                
                console.log(`✅ Updated ${user.username} with plain text password`);
            } catch (error) {
                console.error(`❌ Failed to decrypt ${user.username}:`, error.message);
            }
        }
        
        // Verify
        const verifyResult = await db.query(
            "SELECT username, LEFT(password, 50) as password_preview FROM users"
        );
        
        console.log('\n📋 Final passwords:');
        console.table(verifyResult.rows);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

decryptAllPasswords();