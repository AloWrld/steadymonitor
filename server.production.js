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

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: NODE_ENV 
    });
});

// ============================================
// MIDDLEWARE
// ============================================

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

const allowedOrigins = [
    'https://steadymonitor-frontend.onrender.com'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.includes(origin) || 
                         origin.endsWith('.onrender.com') || 
                         origin.endsWith('.vercel.app');

        if (isAllowed) {
            callback(null, true);
        } else {
            console.error(`❌ CORS blocked for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.set('trust proxy', 1);

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
        secure: true, 
        httpOnly: true,
        sameSite: 'none', 
        maxAge: 24 * 60 * 60 * 1000 
    },
    name: 'sid'
}));

// Static files must be served BEFORE routes to let window.loadPage work
app.use(express.static(path.join(__dirname, 'frontend'), {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// ============================================
// API ROUTES (Option B: No (pool) passed)
// ============================================

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
// FRONTEND ROUTING & REDIRECTS
// ============================================

// Public access logic
const publicRoutes = ['/', '/login.html', '/register.html'];
publicRoutes.forEach(route => {
    app.get(route, (req, res) => {
        if (req.session.userId) {
            return res.redirect('/admin.html');
        }
        res.sendFile(path.join(__dirname, 'frontend', route === '/' ? 'login.html' : route));
    });
});

// Protected access logic
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

// Catch-all for API 404s
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl
    });
});

// Unified Frontend Catch-all (Supports SPA and window.loadPage)
app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) return; // handled above

    const filePath = path.join(__dirname, 'frontend', req.path);
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        return res.sendFile(filePath);
    }
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

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

app.listen(PORT, '0.0.0.0', () => {
    const fUrl = isProduction ? process.env.FRONTEND_URL : 'http://localhost:3000';
    const aUrl = isProduction ? (process.env.API_URL || `https://steadymonitor-backend.onrender.com/api`) : `http://localhost:${PORT}/api`;
    
    console.log(`
🚀 Server listening on 0.0.0.0:${PORT}
📡 Mode: ${NODE_ENV}
🌐 Allowed Frontend: ${fUrl}
🔗 API Base: ${aUrl}
🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}
📦 Serving frontend: Yes (All Environments)
    `);
});

process.on('SIGTERM', () => {
    pool.end(() => {
        process.exit(0);
    });
});
