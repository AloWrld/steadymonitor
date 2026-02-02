const { query } = require('../config/database');
// backend/services/authService.js - SESSION AUTH VERSION
class AuthService {
    constructor(database) {
        this.db = database;
    }

    async login(username, password) {
        try {
            console.log(`🔐 Login attempt for: ${username}`);
            
            const query = 'SELECT * FROM users WHERE username = $1';
            const result = await this.db.query(query, [username]);
            
            if (result.rows.length === 0) {
                console.log('❌ User not found');
                return { success: false, message: 'Invalid username or password' };
            }
            
            const user = result.rows[0];
            console.log('✅ Found user:', user.username, 'Role:', user.role);
            
            if (password === user.password) {
                console.log('✅ Password matches!');
                
                const userData = {
                    user_id: user.user_id,
                    username: user.username,
                    role: user.role,
                    display_name: user.display_name || user.username,
                    department: user.department
                };
                
                return {
                    success: true,
                    user: userData,
                    redirectTo: this.getRedirectPath(user.role)
                };
            } else {
                console.log('❌ Password mismatch');
                return { success: false, message: 'Invalid username or password' };
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            return { success: false, message: 'Login failed. Please try again.' };
        }
    }

    getRedirectPath(role) {
        switch(role) {
            case 'admin':
                return '/admin.html';
            case 'department_uniform':
            case 'department_stationery':
            default:
                return '/department.html';
        }
    }

    getUserPermissions(role) {
        const permissions = {
            admin: [
                'admin.html', 'department.html', 'payments.html', 'pos.html', 
                'refunds.html', 'pocket_money.html', 'customers.html', 'inventory.html',
                'suppliers.html', 'reports.html', 'overview.html', 'allocations.html'
            ],
            department_uniform: [
                'department.html', 'payments.html', 'pos.html', 
                'pocket_money.html', 'customers.html', 'allocations.html',
            ],
            department_stationery: [
                'department.html', 'payments.html', 'pos.html', 
                'pocket_money.html', 'customers.html', 'allocations.html',
            ]
        };
        
        return permissions[role] || permissions.department_uniform;
    }
}

module.exports = AuthService;
