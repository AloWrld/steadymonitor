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
    ssl: isProduction ? { rejectUnauthorized: false } : false
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

// CORS configuration - FIXED
const corsOptions = {
    origin: isProduction
        ? [process.env.FRONTEND_URL] // Vercel URL goes here
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
        secure: isProduction,
        httpOnly: true,
        sameSite: isProduction ? 'lax' : 'lax',
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
            // If already logged in, redirect to dashboard
            if (req.session.userId) {
                return res.redirect('/admin.html');
            }
            res.sendFile(path.join(__dirname, 'frontend', route === '/' ? 'login.html' : route));
        });
    });

    // Protected routes (require auth)
    const protectedRoutes = [
        '/admin.html',
        '/department.html',
        '/customers.html',
        '/inventory.html',
        '/overview.html',
        '/payments.html',
        '/pocket_money.html',
        '/pos.html',
        '/refunds.html',
        '/reports.html',
        '/suppliers.html',
        '/allocations.html'
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


    // Frontend 404 handler
    app.use('*', (req, res) => {
        res.status(404).sendFile(path.join(__dirname, 'frontend', '404.html'));
    });
}

// ============================================
// API 404 HANDLER (ALWAYS ACTIVE)
// ============================================

app.use('/api/:anything*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'API endpoint not found',
        path: req.path 
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

app.listen(PORT, () => {
    console.log(`
🚀 Server running in ${NODE_ENV} mode
📡 Port: ${PORT}
🌐 Frontend: ${isProduction ? process.env.FRONTEND_URL : 'http://localhost:3000'}
🔗 API: ${isProduction ? process.env.API_URL || `http://localhost:${PORT}/api` : 'http://localhost:' + PORT + '/api'}
🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}
📦 Serving frontend: ${!isProduction ? 'Yes (development only)' : 'No (API only)'}
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