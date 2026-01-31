const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const fs = require('fs');

require('dotenv').config();

const app = express();

// ============================================
// CONFIGURATION
// ============================================

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Database pool for sessions
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "cdnjs.cloudflare.com", "data:"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Updated CORS to allow both domains
const allowedOrigins = [
    'https://steadymonitor.vercel.app',
    'https://hattyjohns-investments.vercel.app'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // 🔥 CRITICAL: Handle preflight requests

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (required for Render + secure cookies) - FIX 2
app.set('trust proxy', 1);

// Session configuration
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'user_sessions',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // MUST be true for SameSite=None - FIX 3
        httpOnly: true,
        sameSite: 'none', // CRITICAL for cross-domain - FIX 3
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'sid'
}));

// Static files (frontend) - ONLY IN DEVELOPMENT
if (!isProduction) {
    app.use(express.static(path.join(__dirname, 'frontend'), {
        maxAge: '0',
        index: false,
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache');
            }
        }
    }));
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: NODE_ENV 
    });
});

// API routes
app.use('/api/auth', require('./backend/routes/authRoutes'));
app.use('/api/dashboard', require('./backend/routes/dashboardRoutes'));
app.use('/api/customers', require('./backend/routes/customerRoutes'));
app.use('/api/payments', require('./backend/routes/paymentRoutes'));
app.use('/api/inventory', require('./backend/routes/inventoryRoutes'));
app.use('/api/suppliers', require('./backend/routes/supplierRoutes'));
app.use('/api/pos', require('./backend/routes/posRoutes'));
app.use('/api/pocket-money', require('./backend/routes/pocketMoneyRoutes'));
app.use('/api/allocations', require('./backend/routes/allocationRoutes'));
app.use('/api/refunds', require('./backend/routes/refundRoutes'));
app.use('/api/reports', require('./backend/routes/reportRoutes'));
app.use('/api/checkout', require('./backend/routes/checkoutRoutes'));
app.use('/api/print', require('./backend/routes/printRoutes'));

// ============================================
// FRONTEND ROUTES - ONLY IN DEVELOPMENT
// ============================================

if (!isProduction) {
    // Public routes
    const publicRoutes = ['/', '/login.html', '/register.html'];
    publicRoutes.forEach(route => {
        app.get(route, (req, res) => {
            if (req.session.userId) {
                return res.redirect('/admin.html');
            }
            res.sendFile(path.join(__dirname, 'frontend', route === '/' ? 'login.html' : route));
        });
    });

    // Protected routes (require auth)
    const protectedRoutes = [
        '/admin.html', '/department.html', '/customers.html',
        '/inventory.html', '/overview.html', '/payments.html',
        '/pocket_money.html', '/pos.html', '/refunds.html',
        '/reports.html', '/suppliers.html', '/allocations.html'
    ];

    protectedRoutes.forEach(route => {
        app.get(route, (req, res) => {
            if (!req.session.userId) {
                return res.redirect('/login.html?redirect=' + encodeURIComponent(route));
            }
            res.sendFile(path.join(__dirname, 'frontend', route));
        });
    });

    // Catch-all for other HTML files
    app.get('/:htmlFile([\\w-]+\\.html)', (req, res) => {
        const filePath = path.join(__dirname, 'frontend', req.params.htmlFile);
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).sendFile(path.join(__dirname, 'frontend', '404.html'));
        }
    });

    // Frontend 404 handler - BACK TO STABLE EXPRESS 4 SYNTAX
    app.use('*', (req, res, next) => {
        if (req.originalUrl.startsWith('/api')) return next();
        res.status(404).sendFile(path.join(__dirname, 'frontend', '404.html'));
    });
}

// ============================================
// API 404 HANDLER (ALWAYS ACTIVE)
// ============================================

app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl
    });
});

// ============================================
// PRODUCTION CATCH-ALL (API ONLY)
// ============================================

if (isProduction) {
    app.use('*', (req, res) => {
        res.status(404).json({
            success: false,
            message: 'Not found. This is an API-only server in production.',
            documentation: `${process.env.FRONTEND_URL}/api-docs`
        });
    });
}

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        ...(NODE_ENV === 'development' && { error: err.message, stack: err.stack })
    });
});

// ============================================
// SERVER STARTUP
// ============================================

// Explicitly binding to 0.0.0.0 is the "Golden Rule" for Render deployments
app.listen(PORT, '0.0.0.0', () => {
    const fUrl = isProduction ? process.env.FRONTEND_URL : 'http://localhost:3000';
    const aUrl = isProduction ? (process.env.API_URL || `https://steadymonitor-backend.onrender.com/api`) : `http://localhost:${PORT}/api`;
    const dbStatus = process.env.DATABASE_URL ? 'Connected' : 'Not configured';

    console.log(`
🚀 Server listening on 0.0.0.0:${PORT}
📡 Mode: ${NODE_ENV}
🌐 Allowed Frontend: ${fUrl}
🔗 API Base: ${aUrl}
🗄️  Database: ${dbStatus}
📦 Serving frontend: ${!isProduction ? 'Yes' : 'No (API only)'}
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server...');
    pool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
    });
});
