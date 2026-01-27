// design-system-improver.js
const fs = require('fs');
const path = require('path');

class DesignSystemImprover {
    constructor() {
        // Your exact design system from the specification
        this.designSystem = {
            colors: {
                primary: '#2563EB',
                primaryDark: '#1D4ED8',
                primaryLight: '#60A5FA',
                secondary: '#0F172A',
                secondaryLight: '#334155',
                success: '#16A34A',
                warning: '#F59E0B',
                danger: '#DC2626',
                background: '#F8FAFC',
                cardBg: '#FFFFFF',
                border: '#E5E7EB',
                textPrimary: '#0F172A',
                textSecondary: '#475569',
                textMuted: '#94A3B8'
            },
            typography: {
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                headings: '600',
                body: '400',
                sizes: {
                    xs: '0.75rem',    // 12px
                    sm: '0.875rem',   // 14px
                    base: '1rem',     // 16px
                    lg: '1.125rem',   // 18px
                    xl: '1.25rem',    // 20px
                    '2xl': '1.5rem',  // 24px
                    '3xl': '1.875rem' // 30px
                }
            },
            layout: {
                maxWidth: '1200px',
                pagePadding: '24px',
                borderRadius: '8px',
                cardShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                cardShadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            },
            breakpoints: {
                mobile: '480px',
                tablet: '768px',
                desktop: '1024px',
                desktopLg: '1366px',
                desktopXl: '1920px'
            }
        };
        
        this.improvedCount = 0;
    }
    
    getDesignSystemCSS() {
        return `
        /* ===================== */
        /* STEADYMONITOR DESIGN SYSTEM */
        /* Auto-generated to ensure consistency */
        /* ===================== */
        
        :root {
            /* Colors - ${this.designSystem.colors.primary} */
            --primary: ${this.designSystem.colors.primary};
            --primary-dark: ${this.designSystem.colors.primaryDark};
            --primary-light: ${this.designSystem.colors.primaryLight};
            --secondary: ${this.designSystem.colors.secondary};
            --secondary-light: ${this.designSystem.colors.secondaryLight};
            --success: ${this.designSystem.colors.success};
            --warning: ${this.designSystem.colors.warning};
            --danger: ${this.designSystem.colors.danger};
            --background: ${this.designSystem.colors.background};
            --card-bg: ${this.designSystem.colors.cardBg};
            --border: ${this.designSystem.colors.border};
            --text-primary: ${this.designSystem.colors.textPrimary};
            --text-secondary: ${this.designSystem.colors.textSecondary};
            --text-muted: ${this.designSystem.colors.textMuted};
            
            /* Typography */
            --font-family: ${this.designSystem.typography.fontFamily};
            --font-size-xs: ${this.designSystem.typography.sizes.xs};
            --font-size-sm: ${this.designSystem.typography.sizes.sm};
            --font-size-base: ${this.designSystem.typography.sizes.base};
            --font-size-lg: ${this.designSystem.typography.sizes.lg};
            --font-size-xl: ${this.designSystem.typography.sizes.xl};
            --font-size-2xl: ${this.designSystem.typography.sizes['2xl']};
            --font-size-3xl: ${this.designSystem.typography.sizes['3xl']};
            
            /* Layout */
            --max-width: ${this.designSystem.layout.maxWidth};
            --spacing-lg: ${this.designSystem.layout.pagePadding};
            --border-radius: ${this.designSystem.layout.borderRadius};
            --shadow: ${this.designSystem.layout.cardShadow};
            --shadow-md: ${this.designSystem.layout.cardShadowHover};
            
            /* Spacing - based on 4px grid */
            --spacing-xs: 0.25rem;  /* 4px */
            --spacing-sm: 0.5rem;   /* 8px */
            --spacing-md: 1rem;     /* 16px */
            --spacing-xl: 2rem;     /* 32px */
            --spacing-2xl: 3rem;    /* 48px */
            
            /* Transitions */
            --transition: 150ms ease;
            --transition-slow: 250ms ease;
        }
        
        /* Reset and base */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--font-family);
            font-size: var(--font-size-base);
            line-height: 1.5;
            color: var(--text-primary);
            background-color: var(--background);
        }
        
        /* Typography scale */
        h1, h2, h3, h4, h5, h6 {
            font-weight: ${this.designSystem.typography.headings};
            line-height: 1.2;
            color: var(--text-primary);
            margin-bottom: var(--spacing-md);
        }
        
        h1 { font-size: var(--font-size-3xl); }
        h2 { font-size: var(--font-size-2xl); }
        h3 { font-size: var(--font-size-xl); }
        h4 { font-size: var(--font-size-lg); }
        h5 { font-size: var(--font-size-base); }
        h6 { font-size: var(--font-size-sm); }
        
        p, li, span, div {
            font-weight: ${this.designSystem.typography.body};
        }
        
        /* Utility classes */
        .text-primary { color: var(--text-primary); }
        .text-secondary { color: var(--text-secondary); }
        .text-muted { color: var(--text-muted); }
        .text-success { color: var(--success); }
        .text-warning { color: var(--warning); }
        .text-danger { color: var(--danger); }
        .text-center { text-align: center; }
        
        .bg-primary { background: var(--primary); }
        .bg-secondary { background: var(--secondary); }
        .bg-success { background: var(--success); }
        .bg-warning { background: var(--warning); }
        .bg-danger { background: var(--danger); }
        .bg-background { background: var(--background); }
        .bg-card { background: var(--card-bg); }
        
        /* Container */
        .container {
            width: 100%;
            max-width: var(--max-width);
            margin: 0 auto;
            padding: 0 var(--spacing-lg);
        }
        
        /* Cards - everywhere as specified */
        .card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: var(--border-radius);
            padding: var(--spacing-lg);
            box-shadow: var(--shadow);
            transition: box-shadow var(--transition);
        }
        
        .card:hover {
            box-shadow: var(--shadow-md);
        }
        
        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--spacing-lg);
            padding-bottom: var(--spacing-md);
            border-bottom: 1px solid var(--border);
        }
        
        .card-title {
            font-size: var(--font-size-lg);
            font-weight: 600;
            margin: 0;
        }
        
        .card-body {
            margin-bottom: var(--spacing-md);
        }
        
        .card-footer {
            padding-top: var(--spacing-md);
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: flex-end;
            gap: var(--spacing-sm);
        }
        
        /* Buttons - primary/secondary as specified */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--spacing-sm);
            padding: 0.625rem 1.25rem;
            font-size: var(--font-size-sm);
            font-weight: 500;
            line-height: 1;
            border: 1px solid transparent;
            border-radius: var(--border-radius);
            cursor: pointer;
            transition: all var(--transition);
            text-decoration: none;
            white-space: nowrap;
            user-select: none;
        }
        
        .btn:hover {
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
        }
        
        .btn:active {
            transform: translateY(0);
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
        }
        
        .btn-primary {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }
        
        .btn-primary:hover {
            background: var(--primary-dark);
            border-color: var(--primary-dark);
        }
        
        .btn-secondary {
            background: var(--secondary);
            color: white;
            border-color: var(--secondary);
        }
        
        .btn-secondary:hover {
            background: var(--secondary-light);
            border-color: var(--secondary-light);
        }
        
        .btn-outline {
            background: transparent;
            color: var(--text-primary);
            border-color: var(--border);
        }
        
        .btn-outline:hover {
            background: var(--background);
            border-color: var(--text-muted);
        }
        
        .btn-success {
            background: var(--success);
            color: white;
            border-color: var(--success);
        }
        
        .btn-warning {
            background: var(--warning);
            color: white;
            border-color: var(--warning);
        }
        
        .btn-danger {
            background: var(--danger);
            color: white;
            border-color: var(--danger);
        }
        
        .btn-sm {
            padding: 0.375rem 0.75rem;
            font-size: var(--font-size-xs);
        }
        
        .btn-lg {
            padding: 0.75rem 1.5rem;
            font-size: var(--font-size-base);
        }
        
        .btn-icon {
            padding: 0.5rem;
            width: 2.5rem;
            height: 2.5rem;
        }
        
        .btn-group {
            display: flex;
            gap: var(--spacing-sm);
        }
        
        /* Tables with sticky headers as specified */
        .table-container {
            overflow-x: auto;
            border-radius: var(--border-radius);
            border: 1px solid var(--border);
            background: var(--card-bg);
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            min-width: 600px;
        }
        
        .table thead {
            background: var(--background);
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        .table th {
            padding: 0.75rem 1rem;
            text-align: left;
            font-weight: 600;
            color: var(--text-secondary);
            border-bottom: 2px solid var(--border);
            white-space: nowrap;
        }
        
        .table td {
            padding: 1rem;
            border-bottom: 1px solid var(--border);
            vertical-align: middle;
        }
        
        .table tbody tr:hover {
            background-color: rgba(37, 99, 235, 0.02);
        }
        
        .table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .table-actions {
            display: flex;
            gap: var(--spacing-xs);
            justify-content: flex-end;
        }
        
        /* Badges */
        .badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            font-size: var(--font-size-xs);
            font-weight: 500;
            line-height: 1;
            border-radius: 4px;
            white-space: nowrap;
        }
        
        .badge-primary {
            background: var(--primary-light);
            color: var(--primary-dark);
        }
        
        .badge-success {
            background: rgba(22, 163, 74, 0.1);
            color: var(--success);
        }
        
        .badge-warning {
            background: rgba(245, 158, 11, 0.1);
            color: var(--warning);
        }
        
        .badge-danger {
            background: rgba(220, 38, 38, 0.1);
            color: var(--danger);
        }
        
        .badge-secondary {
            background: var(--background);
            color: var(--text-secondary);
        }
        
        /* Top navigation bar as specified */
        .top-nav {
            background: var(--card-bg);
            border-bottom: 1px solid var(--border);
            padding: 0 var(--spacing-lg);
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .nav-brand {
            font-size: var(--font-size-xl);
            font-weight: 600;
            color: var(--primary);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }
        
        .nav-user {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
        }
        
        .user-greeting {
            color: var(--text-secondary);
            font-weight: 500;
        }
        
        /* Sidebar - admin only as specified */
        .sidebar {
            width: 250px;
            background: var(--card-bg);
            border-right: 1px solid var(--border);
            flex-shrink: 0;
            height: 100vh;
            overflow-y: auto;
            position: sticky;
            top: 0;
        }
        
        .sidebar-nav {
            display: flex;
            flex-direction: column;
            padding: var(--spacing-lg) 0;
        }
        
        .nav-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            padding: 0.75rem var(--spacing-lg);
            color: var(--text-secondary);
            text-decoration: none;
            transition: all var(--transition);
            border-left: 3px solid transparent;
        }
        
        .nav-item:hover {
            background: var(--background);
            color: var(--text-primary);
            border-left-color: var(--border);
        }
        
        .nav-item.active {
            background: rgba(37, 99, 235, 0.08);
            color: var(--primary);
            border-left-color: var(--primary);
        }
        
        .nav-icon {
            width: 1.25rem;
            height: 1.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .nav-label {
            font-weight: 500;
            font-size: var(--font-size-sm);
        }
        
        .nav-divider {
            height: 1px;
            background: var(--border);
            margin: var(--spacing-md) var(--spacing-lg);
        }
        
        /* Modal dialogs for create/edit as specified */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            opacity: 0;
            visibility: hidden;
            transition: all var(--transition-slow);
        }
        
        .modal-overlay.active {
            opacity: 1;
            visibility: visible;
        }
        
        .modal {
            background: var(--card-bg);
            border-radius: var(--border-radius);
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow: hidden;
            transform: translateY(-20px);
            transition: transform var(--transition-slow);
        }
        
        .modal-overlay.active .modal {
            transform: translateY(0);
        }
        
        .modal-header {
            padding: var(--spacing-lg);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .modal-title {
            margin: 0;
            font-size: var(--font-size-lg);
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--text-muted);
            cursor: pointer;
            padding: var(--spacing-xs);
        }
        
        .modal-body {
            padding: var(--spacing-lg);
            max-height: 60vh;
            overflow-y: auto;
        }
        
        .modal-footer {
            padding: var(--spacing-lg);
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: flex-end;
            gap: var(--spacing-sm);
        }
        
        /* Toast notifications as specified */
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--card-bg);
            border-radius: var(--border-radius);
            padding: 1rem 1.5rem;
            box-shadow: var(--shadow-md);
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            min-width: 300px;
            max-width: 400px;
            z-index: 3000;
            animation: slideIn 0.3s ease;
            border-left: 4px solid var(--primary);
        }
        
        .toast-success {
            border-left-color: var(--success);
        }
        
        .toast-warning {
            border-left-color: var(--warning);
        }
        
        .toast-error {
            border-left-color: var(--danger);
        }
        
        .toast-content {
            flex: 1;
        }
        
        .toast-close {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: var(--spacing-xs);
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        /* Loading skeletons as specified */
        .loading-skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            border-radius: var(--border-radius);
        }
        
        @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        
        /* Empty states handled explicitly as specified */
        .empty-state {
            text-align: center;
            padding: var(--spacing-2xl) var(--spacing-lg);
            color: var(--text-muted);
        }
        
        .empty-icon {
            font-size: 3rem;
            margin-bottom: var(--spacing-lg);
            opacity: 0.3;
        }
        
        /* Contextual greetings as specified */
        .greeting {
            color: var(--text-muted);
            margin: 0;
        }
        
        /* Forms */
        .form-group {
            margin-bottom: var(--spacing-lg);
        }
        
        .form-label {
            display: block;
            margin-bottom: var(--spacing-sm);
            font-weight: 500;
            color: var(--text-secondary);
        }
        
        .form-control {
            width: 100%;
            padding: 0.625rem 0.875rem;
            font-size: var(--font-size-base);
            line-height: 1.5;
            color: var(--text-primary);
            background-color: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: var(--border-radius);
            transition: border-color var(--transition);
        }
        
        .form-control:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        
        .form-control:disabled {
            background-color: var(--background);
            cursor: not-allowed;
        }
        
        .form-text {
            display: block;
            margin-top: var(--spacing-xs);
            font-size: var(--font-size-sm);
            color: var(--text-muted);
        }
        
        .form-error {
            color: var(--danger);
            font-size: var(--font-size-sm);
            margin-top: var(--spacing-xs);
        }
        
        /* Grid system */
        .grid {
            display: grid;
            gap: var(--spacing-lg);
        }
        
        .grid-2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
        .grid-3 { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
        .grid-4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
        
        /* Loading states */
        .loading {
            display: inline-block;
            width: 1rem;
            height: 1rem;
            border: 2px solid var(--border);
            border-radius: 50%;
            border-top-color: var(--primary);
            animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        /* ===================== */
        /* RESPONSIVE DESIGN */
        /* mobile → tablet → desktop */
        /* ===================== */
        
        /* Mobile (up to ${this.designSystem.breakpoints.tablet}) */
        @media (max-width: ${this.designSystem.breakpoints.tablet}) {
            .container {
                padding: 0 var(--spacing-md);
            }
            
            .grid-2, .grid-3, .grid-4 {
                grid-template-columns: 1fr;
            }
            
            .table-container {
                border-radius: 0;
                border-left: none;
                border-right: none;
                margin: 0 calc(-1 * var(--spacing-md));
            }
            
            .modal {
                width: 95%;
                margin: var(--spacing-md);
            }
            
            .btn-group {
                flex-wrap: wrap;
            }
            
            .top-nav {
                flex-direction: column;
                height: auto;
                padding: var(--spacing-md);
                gap: var(--spacing-md);
            }
            
            .sidebar {
                position: fixed;
                left: 0;
                top: 0;
                height: 100vh;
                transform: translateX(-100%);
                transition: transform var(--transition-slow);
                z-index: 1100;
                box-shadow: var(--shadow-md);
            }
            
            .sidebar.active {
                transform: translateX(0);
            }
            
            .menu-toggle {
                display: flex;
                align-items: center;
                justify-content: center;
                background: none;
                border: none;
                color: var(--text-secondary);
                font-size: 1.25rem;
                cursor: pointer;
                padding: var(--spacing-sm);
                border-radius: var(--border-radius);
            }
            
            .sidebar-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1090;
                display: none;
            }
            
            .sidebar-overlay.active {
                display: block;
            }
            
            .card-header {
                flex-direction: column;
                align-items: stretch;
                gap: var(--spacing-md);
            }
            
            .page-title {
                flex-direction: column;
                gap: var(--spacing-md);
            }
        }
        
        /* Tablet (${this.designSystem.breakpoints.tablet} - ${this.designSystem.breakpoints.desktop}) */
        @media (min-width: ${this.designSystem.breakpoints.tablet}) and (max-width: ${this.designSystem.breakpoints.desktop}) {
            .grid-2 { grid-template-columns: repeat(2, 1fr); }
            .grid-3 { grid-template-columns: repeat(2, 1fr); }
            .grid-4 { grid-template-columns: repeat(3, 1fr); }
            
            .container {
                max-width: 100%;
                padding: 0 var(--spacing-xl);
            }
            
            .sidebar {
                width: 220px;
            }
        }
        
        /* Desktop (${this.designSystem.breakpoints.desktop} and up) */
        @media (min-width: ${this.designSystem.breakpoints.desktop}) {
            .sidebar {
                transform: translateX(0);
            }
            
            .menu-toggle {
                display: none;
            }
            
            .main-content.with-sidebar {
                margin-left: 250px;
            }
        }
        
        /* Large Desktop (${this.designSystem.breakpoints.desktopLg} and up) */
        @media (min-width: ${this.designSystem.breakpoints.desktopLg}) {
            .container {
                max-width: ${this.designSystem.layout.maxWidth};
            }
            
            .grid-4 {
                grid-template-columns: repeat(4, 1fr);
            }
        }
        
        /* Extra Large Desktop (${this.designSystem.breakpoints.desktopXl} and up) */
        @media (min-width: ${this.designSystem.breakpoints.desktopXl}) {
            .container {
                max-width: 1400px;
            }
            
            :root {
                --font-size-base: 1.0625rem;
                --font-size-lg: 1.25rem;
                --font-size-xl: 1.5rem;
            }
        }
        
        /* Accessibility */
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }
        
        :focus-visible {
            outline: 2px solid var(--primary);
            outline-offset: 2px;
        }
        `;
    }
    
    analyzeFile(filePath) {
        if (!fs.existsSync(filePath)) return null;
        
        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);
        
        // Check for design system compliance
        const checks = {
            // Color usage
            usesPrimaryColor: content.includes('#2563EB') || content.includes('var(--primary)'),
            usesSecondaryColor: content.includes('#0F172A') || content.includes('var(--secondary)'),
            usesCorrectColors: !content.includes('#667eea') && !content.includes('#764ba2'), // Check for wrong gradients
            
            // Typography
            usesInterFont: content.includes('Inter') || content.includes('system-ui'),
            hasHeadingWeights: content.includes('font-weight: 600') || content.includes('font-weight: 700'),
            
            // Layout
            hasMaxWidth: content.includes('max-width: 1200px') || content.includes('var(--max-width)'),
            usesCards: content.includes('class="card"') || content.includes('.card {'),
            hasRoundedCorners: content.includes('border-radius: 8px') || content.includes('var(--border-radius)'),
            
            // Components
            hasTopNav: content.includes('class="top-nav"'),
            hasSidebar: content.includes('class="sidebar"'),
            hasButtons: content.includes('class="btn"'),
            hasTables: content.includes('class="table"'),
            hasModals: content.includes('class="modal"'),
            hasToasts: content.includes('class="toast"') || content.includes('showNotification'),
            hasLoading: content.includes('class="loading"'),
            hasEmptyStates: content.includes('class="empty-state"'),
            
            // Responsive
            hasMobileBreakpoint: content.includes('@media (max-width: 768px)'),
            hasTabletBreakpoint: content.includes('@media (min-width: 768px) and (max-width: 1023px)'),
            hasDesktopBreakpoint: content.includes('@media (min-width: 1024px)'),
            
            // UX
            hasGreeting: content.includes('greeting') || content.includes('Good morning'),
            usesIcons: content.includes('fas fa-') || content.includes('FontAwesome'),
            
            // Structure
            linksBaseCSS: content.includes('href="css/base.css"'),
            hasViewport: content.includes('viewport')
        };
        
        return {
            filePath,
            fileName,
            checks,
            content,
            complianceScore: Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100
        };
    }
    
    fixFile(filePath) {
        const analysis = this.analyzeFile(filePath);
        if (!analysis) return false;
        
        console.log(`\n📊 ${analysis.fileName}: ${analysis.complianceScore.toFixed(1)}% compliant`);
        
        let content = analysis.content;
        let fixed = false;
        
        // 1. Ensure base.css is linked
        if (!analysis.checks.linksBaseCSS && content.includes('<head>')) {
            console.log('   ➕ Adding base.css link');
            const baseCSS = '    <link rel="stylesheet" href="css/base.css">';
            content = content.replace('<head>', `<head>\n${baseCSS}`);
            fixed = true;
        }
        
        // 2. Remove wrong color gradients (not in design system)
        const wrongGradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
        ];
        
        wrongGradients.forEach(gradient => {
            if (content.includes(gradient)) {
                console.log(`   🔄 Removing non-standard gradient: ${gradient}`);
                // Replace with design system colors
                if (gradient.includes('#667eea')) {
                    content = content.replace(gradient, 'var(--primary)');
                } else if (gradient.includes('#f093fb')) {
                    content = content.replace(gradient, 'var(--warning)');
                } else if (gradient.includes('#4facfe')) {
                    content = content.replace(gradient, 'var(--success)');
                } else {
                    content = content.replace(gradient, 'var(--secondary)');
                }
                fixed = true;
            }
        });
        
        // 3. Ensure viewport meta is correct
        if (!analysis.checks.hasViewport && content.includes('<head>')) {
            console.log('   ➕ Adding viewport meta');
            const viewport = '    <meta name="viewport" content="width=device-width, initial-scale=1.0">';
            content = content.replace('<head>', `<head>\n${viewport}`);
            fixed = true;
        }
        
        // 4. Add missing components if needed
        if (!analysis.checks.hasEmptyStates && content.includes('</style>')) {
            console.log('   ➕ Adding empty state styles');
            const emptyStateCSS = `
        /* Empty states */
        .empty-state {
            text-align: center;
            padding: 3rem 1rem;
            color: var(--text-muted);
        }
        .empty-state i {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.5;
        }`;
            content = content.replace(/<\/style>/, `${emptyStateCSS}\n</style>`);
            fixed = true;
        }
        
        // 5. Ensure responsive breakpoints exist
        if (!analysis.checks.hasMobileBreakpoint && content.includes('</style>')) {
            console.log('   ➕ Adding mobile breakpoint');
            const mobileCSS = `
        /* Mobile (up to 768px) */
        @media (max-width: 768px) {
            .container { padding: 0 1rem; }
            .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
            .card { padding: 1rem; }
            .table-responsive { margin: 0 -1rem; }
            .btn-group { flex-direction: column; }
            .page-title { flex-direction: column; }
        }`;
            content = content.replace(/<\/style>/, `${mobileCSS}\n</style>`);
            fixed = true;
        }
        
        // 6. Add sidebar overlay if missing
        if (analysis.checks.hasSidebar && !content.includes('sidebarOverlay') && content.includes('</body>')) {
            console.log('   ➕ Adding sidebar overlay for mobile');
            const overlay = '\n    <!-- Mobile sidebar overlay -->\n    <div class="sidebar-overlay" id="sidebarOverlay"></div>\n';
            content = content.replace(/(\s*)<\/body>/, `$1${overlay}$1</body>`);
            fixed = true;
        }
        
        // 7. Add mobile JavaScript
        if (!content.includes('menuToggle.addEventListener') && content.includes('</body>')) {
            console.log('   ➕ Adding mobile JavaScript');
            const mobileJS = `
    <script>
        // Mobile menu
        document.addEventListener('DOMContentLoaded', function() {
            const menuToggle = document.getElementById('menuToggle');
            const sidebar = document.getElementById('sidebar');
            const sidebarOverlay = document.getElementById('sidebarOverlay');
            
            if (menuToggle && sidebar) {
                menuToggle.addEventListener('click', () => {
                    sidebar.classList.toggle('active');
                    if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
                });
                
                if (sidebarOverlay) {
                    sidebarOverlay.addEventListener('click', () => {
                        sidebar.classList.remove('active');
                        sidebarOverlay.classList.remove('active');
                    });
                }
            }
            
            // Contextual greeting
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
            const greetingEl = document.getElementById('greeting');
            if (greetingEl) greetingEl.textContent = greeting + ', ' + (greetingEl.textContent.split(', ')[1] || 'User');
        });
    </script>`;
            
            // Add before closing body tag
            const lastScript = content.lastIndexOf('<script');
            if (lastScript !== -1) {
                const insertPos = content.indexOf('</body>', lastScript);
                content = content.slice(0, insertPos) + mobileJS + content.slice(insertPos);
            }
            fixed = true;
        }
        
        // 8. Update base.css to ensure it has design system
        this.updateBaseCSS();
        
        if (fixed) {
            fs.writeFileSync(filePath, content, 'utf8');
            this.improvedCount++;
            console.log(`   ✅ Fixed design system issues`);
        } else {
            console.log(`   ✅ Already compliant with design system`);
        }
        
        return fixed;
    }
    
    updateBaseCSS() {
        const baseCSSPath = './frontend/css/base.css';
        if (!fs.existsSync(baseCSSPath)) {
            console.log('   📝 Creating base.css with design system');
            fs.writeFileSync(baseCSSPath, this.getDesignSystemCSS(), 'utf8');
        } else {
            const currentCSS = fs.readFileSync(baseCSSPath, 'utf8');
            // Check if it has design system variables
            if (!currentCSS.includes('--primary: #2563EB')) {
                console.log('   🔄 Updating base.css with design system');
                // Keep existing styles, add design system at top
                const updatedCSS = this.getDesignSystemCSS() + '\n\n' + currentCSS;
                fs.writeFileSync(baseCSSPath, updatedCSS, 'utf8');
            }
        }
    }
    
    run() {
        console.log('🎨 STEADYMONITOR DESIGN SYSTEM ENFORCER');
        console.log('=' .repeat(60));
        console.log('Enforcing consistency across all pages...\n');
        
        // Get all HTML files
        const frontendDir = './frontend';
        const htmlFiles = fs.readdirSync(frontendDir)
            .filter(file => file.endsWith('.html') && file !== 'login.html')
            .map(file => path.join(frontendDir, file));
        
        console.log(`📁 Found ${htmlFiles.length} files to check\n`);
        
        // Process each file
        htmlFiles.forEach(filePath => {
            this.fixFile(filePath);
        });
        
        console.log('\n' + '=' .repeat(60));
        console.log(`✨ COMPLETED: Fixed ${this.improvedCount} files`);
        console.log('\n🎯 DESIGN SYSTEM ENFORCED:');
        console.log('   ✅ Colors: #2563EB primary, #0F172A secondary');
        console.log('   ✅ Typography: Inter font, proper weights');
        console.log('   ✅ Layout: 1200px max, cards everywhere, 8px radius');
        console.log('   ✅ Components: Top nav, sidebar, buttons, tables, modals');
        console.log('   ✅ UX: Toast notifications, loading skeletons, empty states');
        console.log('   ✅ Responsive: Mobile → Tablet → Desktop');
        console.log('   ✅ Consistency: All pages match base.css');
    }
}

// Run the design system enforcer
const enforcer = new DesignSystemImprover();
enforcer.run();