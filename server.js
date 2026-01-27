/**
 * ============================================================
 * STEADYMONITOR POS SYSTEM — SERVER ENTRY POINT
 * Version: 3.0
 * Node.js: 22+
 * Express: 4.x / 5.x compatible
 * Database: PostgreSQL
 * ============================================================
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const { requireAuth } = require('./backend/middleware/authMiddleware');
const { checkDatabaseConnection, getDatabaseStats } = require('./backend/config/database');
const { getPool } = require('./backend/config/database');

// ------------------------------------------------------------
// 1. IMPORT ROUTES
// ------------------------------------------------------------
const posRoutes = require('./backend/routes/posRoutes');
const checkoutRoutes = require('./backend/routes/checkoutRoutes');
const customerRoutes = require('./backend/routes/customerRoutes');
const inventoryRoutes = require('./backend/routes/inventoryRoutes');
const supplierRoutes = require('./backend/routes/supplierRoutes');
const reportRoutes = require('./backend/routes/reportRoutes');
const authRoutes = require('./backend/routes/authRoutes')(getPool());
const allocationRoutes = require('./backend/routes/allocationRoutes');
const paymentRoutes = require('./backend/routes/paymentRoutes');
const pocketMoneyRoutes = require('./backend/routes/pocketMoneyRoutes');
const dashboardRoutes = require('./backend/routes/dashboardRoutes');
const refundRoutes = require('./backend/routes/refundRoutes');
const printRoutes = require('./backend/routes/printRoutes');


// ------------------------------------------------------------
// 2. APP INITIALIZATION
// ------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------
// 3. DATABASE INITIALIZATION
// ------------------------------------------------------------
async function initializeDatabase() {
    console.log('🔍 Checking database connection...');

    try {
        const isConnected = await checkDatabaseConnection();

        if (!isConnected) {
            console.error('❌ Database connection failed');
            return;
        }

        console.log('✅ PostgreSQL database connected successfully');

        const stats = await getDatabaseStats();
        console.log('📊 Database Statistics:', stats);

        const { query } = require('./backend/config/database');
        const result = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'products'
            );
        `);

        if (!result.rows[0].exists) {
            console.warn('⚠️ Database tables not found. Run schema-enhanced.sql');
        }

    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
    }
}

// ------------------------------------------------------------
// 4. AUTH CONFIG VALIDATION
// ------------------------------------------------------------
function checkAuthConfig() {
    const configPath = path.join(__dirname, 'backend', 'config', 'auth-config.json');

    if (!fs.existsSync(configPath)) {
        console.warn('⚠️ auth-config.json missing. Creating default.');

        fs.writeFileSync(
            configPath,
            JSON.stringify({
                departments: ['Uniform', 'Stationery', 'Admin'],
                sessionDuration: 24,
                passwordPolicy: { minLength: 6, requireNumbers: true }
            }, null, 2)
        );
    }
}

// ------------------------------------------------------------
// 5. GLOBAL MIDDLEWARE (ORDER MATTERS)
// ------------------------------------------------------------
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
app.use(session({
    store: new pgSession({
        pool: getPool(),
        tableName: 'user_sessions',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'steadymonitor-production-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'sid'
}));

// ------------------------------------------------------------
// 6. STATIC FRONTEND ASSETS
// ------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'frontend')));

// ------------------------------------------------------------
// 7. API ROUTES
// ------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/pocket_money', pocketMoneyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/print', printRoutes);

// ------------------------------------------------------------
// 8. FRONTEND PAGE ROUTING (AUTH PROTECTED)
// ------------------------------------------------------------
const frontendPages = {
    '/': 'login.html',
    '/pos': 'pos.html',
    '/inventory': 'inventory.html',
    '/reports': 'reports.html',
    '/customers': 'customers.html',
    '/checkout': 'checkout.html',
    '/suppliers': 'suppliers.html',
    '/allocations': 'allocations.html',
    '/payments': 'payments.html',
    '/pocket_money': 'pocket_money.html',
    '/dashboard': 'dashboard.html',
    '/refunds': 'refunds.html'
};

Object.entries(frontendPages).forEach(([route, file]) => {
    app.get(route, requireAuth, (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend', file));
    });
});

// Login page (public)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

// ------------------------------------------------------------
// 9. HEALTH CHECK
// ------------------------------------------------------------
app.get('/health', async (req, res) => {
    const dbConnected = await checkDatabaseConnection();

    res.json({
        status: 'OK',
        database: dbConnected ? 'Connected' : 'Disconnected',
        time: new Date().toISOString()
    });
});

// ------------------------------------------------------------
// 10. ERROR HANDLER (MUST HAVE 4 PARAMS)
// ------------------------------------------------------------
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);

    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// ------------------------------------------------------------
// 11. FINAL 404 HANDLER (NO WILDCARDS — STABLE)
// ------------------------------------------------------------
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Resource or Page not found',
        path: req.path
    });
});

// ------------------------------------------------------------
// 12. START SERVER
// ------------------------------------------------------------
async function startServer() {
    checkAuthConfig();
    await initializeDatabase();


// Test database connection
app.get('/api/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ 
            success: true, 
            message: 'Database connected successfully',
            timestamp: result.rows[0].now 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Database connection failed',
            error: error.message 
        });
    }
});

    app.listen(PORT, () => {
        console.log(`🚀 SteadyMonitor running at http://localhost:${PORT}`);
    });
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

startServer();

module.exports = app;
