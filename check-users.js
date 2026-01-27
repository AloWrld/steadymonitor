// check-users.js - FIXED
const { getPool } = require('./backend/config/database');

async function checkUsers() {
    const db = getPool();
    
    try {
        // First, check what columns exist in users table
        const columnsResult = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);
        
        console.log('📋 COLUMNS IN USERS TABLE:');
        console.table(columnsResult.rows);
        
        // Build query dynamically based on actual columns
        const columnNames = columnsResult.rows.map(col => col.column_name);
        const selectColumns = columnNames.join(', ');
        
        // Get all users
        const usersResult = await db.query(`
            SELECT ${selectColumns}
            FROM users
            ORDER BY username
        `);
        
        console.log('\n👥 ALL USERS IN DATABASE:');
        console.log('='.repeat(80));
        
        usersResult.rows.forEach((user, index) => {
            console.log(`\n${index + 1}. USERNAME: ${user.username || 'N/A'}`);
            console.log(`   ID: ${user.user_id || 'N/A'}`);
            console.log(`   ROLE: ${user.role || 'N/A'}`);
            console.log(`   DEPARTMENT: ${user.department || 'N/A'}`);
            console.log(`   DISPLAY NAME: ${user.display_name || 'N/A'}`);
            
            // Show password (masked for security)
            if (user.password) {
                const pwd = user.password;
                if (pwd.length > 20) {
                    console.log(`   PASSWORD: ${pwd.substring(0, 20)}... (${pwd.length} chars)`);
                } else {
                    console.log(`   PASSWORD: ${pwd}`);
                }
            }
            
            // Show other columns
            const otherCols = columnNames.filter(col => 
                !['username', 'user_id', 'role', 'department', 'display_name', 'password'].includes(col)
            );
            
            otherCols.forEach(col => {
                if (user[col] !== undefined && user[col] !== null) {
                    console.log(`   ${col.toUpperCase()}: ${user[col]}`);
                }
            });
        });
        
        console.log('\n' + '='.repeat(80));
        console.log(`Total users: ${usersResult.rows.length}`);
        
        // Check for admin user
        const adminUsers = usersResult.rows.filter(u => u.role === 'admin');
        console.log(`Admin users: ${adminUsers.length}`);
        adminUsers.forEach(admin => {
            console.log(`  - ${admin.username} (password length: ${admin.password?.length || 0})`);
        });
        
    } catch (error) {
        console.error('❌ Error checking users:', error.message);
        console.error('Stack:', error.stack);
    }
}

checkUsers();