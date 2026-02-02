
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
            a.innerHTML = `<i class="${item.icon} nav-icon"></i><span class="nav-label">${item.label}</span>`;
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
            userInfo.innerHTML = `
                <i class="fas fa-user-circle nav-icon"></i>
                <div style="display: flex; flex-direction: column;">
                    <span class="nav-label" style="font-weight:600">${userName}</span>
                    <small style="opacity:0.8;font-size:12px">${userRole.replace('_',' ').toUpperCase()}</small>
                </div>
            `;
            this.sidebarNav.appendChild(userInfo);

            const logoutItem = document.createElement('a');
            logoutItem.href = '#';
            logoutItem.className = 'nav-item logout-item';
            logoutItem.innerHTML = `<i class="fas fa-sign-out-alt nav-icon"></i><span class="nav-label">Logout</span>`;
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
