// setup-full-fix.js
// Node.js script to fully fix auth, responsive layout, and menu
// Works for HTML files in steadymonitor/frontend/*.html

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, 'steadymonitor', 'frontend');
const JS_DIR = path.join(FRONTEND_DIR, 'js');

// Ensure js directory exists
if (!fs.existsSync(JS_DIR)) fs.mkdirSync(JS_DIR, { recursive: true });

// ---------------------------
// 1. Create auth-redirect.js
// ---------------------------
const authRedirectCode = `
// auth-redirect.js
(function () {
    'use strict';

    async function checkAuth() {
        const user = window.auth?.getUser ? window.auth.getUser() : null;
        if (!user) {
            window.location.href = 'index.html';
        }
    }

    document.addEventListener('DOMContentLoaded', checkAuth);
})();
`;

fs.writeFileSync(path.join(JS_DIR, 'auth-redirect.js'), authRedirectCode);
console.log('✅ auth-redirect.js created');

// ---------------------------
// 2. Create responsive-fix.js
// ---------------------------
const responsiveFixCode = `
// responsive-fix.js
(function () {
    'use strict';

    function fixResponsiveElements() {
        document.querySelectorAll('table').forEach(table => {
            if (!table.parentElement.classList.contains('table-container')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-container';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        });

        const mainContent = document.querySelector('.main-content, .page-content');
        if (mainContent) mainContent.style.minHeight = window.innerHeight - 64 + 'px';

        document.querySelectorAll('.grid, .responsive-grid').forEach(grid => {
            if (grid.children.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'empty-state';
                empty.innerHTML = '<i class="fas fa-box-open"></i><p>No items available</p>';
                grid.appendChild(empty);
            }
        });
    }

    window.addEventListener('resize', fixResponsiveElements);
    document.addEventListener('DOMContentLoaded', fixResponsiveElements);
})();
`;

fs.writeFileSync(path.join(JS_DIR, 'responsive-fix.js'), responsiveFixCode);
console.log('✅ responsive-fix.js created');

// ---------------------------
// 3. Overwrite menu.js
// ---------------------------
const fixedMenuJS = `
// menu.js - Fixed universal version
(function () {
    'use strict';

    const MENU_CONFIG = {
        admin: [
            { icon: 'fas fa-tachometer-alt', label: 'Dashboard', page: 'admin.html' },
            { icon: 'fas fa-building', label: 'Departments', page: 'department.html' },
            { icon: 'fas fa-users', label: 'Customers', page: 'customers.html' },
            { icon: 'fas fa-credit-card', label: 'Payments', page: 'payments.html' },
            { icon: 'fas fa-cash-register', label: 'POS', page: 'pos.html' },
            { icon: 'fas fa-boxes', label: 'Inventory', page: 'inventory.html' },
            { icon: 'fas fa-truck', label: 'Suppliers', page: 'suppliers.html' },
            { icon: 'fas fa-wallet', label: 'Pocket Money', page: 'pocket_money.html' },
            { icon: 'fas fa-exchange-alt', label: 'Refunds', page: 'refunds.html' },
            { icon: 'fas fa-chart-bar', label: 'Reports', page: 'reports.html' },
            { icon: 'fas fa-chart-pie', label: 'Overview', page: 'overview.html' },
            { icon: 'fas fa-gift', label: 'Allocations', page: 'allocations.html' }
        ],
        department_uniform: [
            { icon: 'fas fa-building', label: 'Departments', page: 'department.html' },      
            { icon: 'fas fa-credit-card', label: 'Payments', page: 'payments.html' },
            { icon: 'fas fa-cash-register', label: 'POS', page: 'pos.html' },
            { icon: 'fas fa-wallet', label: 'Pocket Money', page: 'pocket_money.html' },
            { icon: 'fas fa-gift', label: 'Allocations', page: 'allocations.html' }
        ],
        department_stationery: [
            { icon: 'fas fa-building', label: 'Departments', page: 'department.html' },
            { icon: 'fas fa-credit-card', label: 'Payments', page: 'payments.html' },
            { icon: 'fas fa-cash-register', label: 'POS', page: 'pos.html' },
            { icon: 'fas fa-wallet', label: 'Pocket Money', page: 'pocket_money.html' },
            { icon: 'fas fa-gift', label: 'Allocations', page: 'allocations.html' }
        ]
    };

    class MenuManager {
        constructor() {
            this.sidebarNav = document.getElementById('sidebarNav');
            this.menuToggle = document.getElementById('menuToggle');
            this.sidebar = document.getElementById('sidebar');
            this.sidebarOverlay = document.getElementById('sidebarOverlay');
            this.user = window.auth?.getUser() || null;
        }

        initialize() {
            if (!this.sidebarNav) return;
            this.buildMenu();
            this.setupMobileMenu();
            this.highlightCurrentPage();
        }

        buildMenu() {
            const role = this.user?.role || 'department_stationery';
            const items = MENU_CONFIG[role] || MENU_CONFIG.department_stationery;
            this.sidebarNav.innerHTML = '';
            items.forEach(item => this.sidebarNav.appendChild(this.createMenuItem(item)));
            this.addUserSection();
        }

        createMenuItem(item) {
            const a = document.createElement('a');
            a.href = item.page;
            a.className = 'nav-item';
            a.innerHTML = \`<i class="\${item.icon} nav-icon"></i><span class="nav-label">\${item.label}</span>\`;
            a.addEventListener('click', () => {
                if (window.innerWidth <= 768) this.closeMobileMenu();
            });
            return a;
        }

        addUserSection() {
            const divider = document.createElement('div');
            divider.className = 'nav-divider';
            this.sidebarNav.appendChild(divider);

            const userInfo = document.createElement('div');
            userInfo.className = 'nav-item';
            userInfo.style.pointerEvents = 'none';
            const userName = this.user?.displayName || this.user?.username || 'User';
            const userRole = this.user?.role || 'Staff';
            userInfo.innerHTML = \`
                <i class="fas fa-user-circle nav-icon"></i>
                <div style="display: flex; flex-direction: column;">
                    <span class="nav-label" style="font-weight:600">\${userName}</span>
                    <small style="opacity:0.8;font-size:12px">\${userRole.replace('_',' ').toUpperCase()}</small>
                </div>
            \`;
            this.sidebarNav.appendChild(userInfo);

            const logoutItem = document.createElement('a');
            logoutItem.href = '#';
            logoutItem.className = 'nav-item logout-item';
            logoutItem.innerHTML = \`<i class="fas fa-sign-out-alt nav-icon"></i><span class="nav-label">Logout</span>\`;
            logoutItem.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.auth?.logout) window.auth.logout().finally(()=>window.location.href='index.html');
                else window.location.href='index.html';
            });
            this.sidebarNav.appendChild(logoutItem);
        }

        highlightCurrentPage() {
            const currentPage = window.location.pathname.split('/').pop() || 'admin.html';
            this.sidebarNav.querySelectorAll('.nav-item:not(.logout-item)').forEach(item => {
                item.classList.toggle('active', item.getAttribute('href') === currentPage);
            });
        }

        setupMobileMenu() {
            if (!this.menuToggle || !this.sidebar || !this.sidebarOverlay) return;
            this.menuToggle.addEventListener('click', () => this.toggleMobileMenu());
            this.sidebarOverlay.addEventListener('click', () => this.closeMobileMenu());
            window.addEventListener('resize', () => { if(window.innerWidth>768)this.closeMobileMenu(); });
        }

        toggleMobileMenu() {
            this.sidebar.classList.toggle('active');
            this.sidebarOverlay.classList.toggle('active');
            document.body.classList.toggle('no-scroll');
        }

        closeMobileMenu() {
            this.sidebar.classList.remove('active');
            this.sidebarOverlay.classList.remove('active');
            document.body.classList.remove('no-scroll');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const menu = new MenuManager();
        menu.initialize();
    });
})();
`;

fs.writeFileSync(path.join(JS_DIR, 'menu.js'), fixedMenuJS);
console.log('✅ menu.js overwritten with fixed universal version');

// ---------------------------
// 4. Inject scripts into all HTML in steadymonitor/frontend
// ---------------------------
function injectScriptsIntoHTML(htmlFile) {
    let html = fs.readFileSync(htmlFile, 'utf8');

    // Remove old injected scripts if present
    html = html.replace(/<script src="js\/(auth-redirect|responsive-fix|menu)\.js"><\/script>/g, '');

    // Inject at end of body
    const injectCode = `
    <script src="js/auth-redirect.js"></script>
    <script src="js/responsive-fix.js"></script>
    <script src="js/menu.js"></script>
    `;

    html = html.replace(/<\/body>/i, injectCode + '\n</body>');

    fs.writeFileSync(htmlFile, html);
}

function traverseHTML(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) traverseHTML(fullPath);
        else if (file.endsWith('.html')) injectScriptsIntoHTML(fullPath);
    });
}

traverseHTML(FRONTEND_DIR);
console.log('✅ Scripts injected into all HTML files');

console.log('🎉 FULL FIX APPLIED: auth redirect, responsive fixes, menu.js');
