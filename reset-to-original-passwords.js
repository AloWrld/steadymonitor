// reset-to-original-passwords.js
const { getPool } = require('./backend/config/database');

async function resetToOriginalPasswords() {
    const db = getPool();
    
    // Your original passwords (plain text)
    const passwordMap = {
        'Harriet Mburu': 'Hattyjohninvestments1@2026',
        'Stella.Uni': '1437stella',
        'Irene.Uni': 'IRENEM',
        'Margaret.Uni': 'NkuNja',
        'Stella.Stat': '1437stella',
        'Irene.Stat': 'IRENEM',
        'Margaret.Stat': 'NkuNja'
    };
    
    try {
        console.log('🔄 Resetting ALL passwords to your original passwords (PLAIN TEXT)...');
        console.log('='.repeat(70));
        
        for (const [username, password] of Object.entries(passwordMap)) {
            await db.query(
                'UPDATE users SET password = $1 WHERE username = $2',
                [password, username]
            );
            console.log(`✅ Set ${username.padEnd(15)} -> "${password}"`);
        }
        
        // Verify all passwords
        const verifyResult = await db.query(
            "SELECT username, role, department, password FROM users ORDER BY username"
        );
        
        console.log('\n📋 ALL PASSWORDS RESET TO ORIGINAL (PLAIN TEXT):');
        console.log('='.repeat(70));
        
        verifyResult.rows.forEach(user => {
            console.log(`${user.username.padEnd(15)} (${user.role.padEnd(20)}) -> "${user.password}"`);
        });
        
        console.log('\n🔑 LOGIN CREDENTIALS:');
        console.log('='.repeat(70));
        console.log('ADMIN:');
        console.log('  Username: Harriet Mburu');
        console.log('  Password: Hattyjohninvestments1@2026');
        console.log('\nUNIFORM DEPARTMENT:');
        console.log('  Stella.Uni    -> 1437stella');
        console.log('  Irene.Uni     -> IRENEM');
        console.log('  Margaret.Uni  -> NkuNja');
        console.log('\nSTATIONERY DEPARTMENT:');
        console.log('  Stella.Stat   -> 1437stella');
        console.log('  Irene.Stat    -> IRENEM');
        console.log('  Margaret.Stat -> NkuNja');
        
        console.log('\n💡 IMPORTANT: Make sure authService.js uses NO encryption!');
        
    } catch (error) {
        console.error('❌ Error resetting passwords:', error.message);
    }
}

resetToOriginalPasswords();