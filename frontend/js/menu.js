// frontend/js/menu.js - Enhanced Dynamic Sidebar
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
            this.user = null;
        }

        async initialize() {
            if (!this.sidebarNav) {
                console.warn('Sidebar nav not found');
                return;
            }

            try {
                // Wait for auth to be ready
                await this.waitForAuth();
                
                // Get user info
                this.user = window.auth?.getUser();
                
                // Build menu
                this.buildMenu();
                
                // Setup mobile menu
                this.setupMobileMenu();
                
                // Highlight current page
                this.highlightCurrentPage();
                
                console.log('Menu initialized for user:', this.user?.role);
                
            } catch (error) {
                console.error('Menu initialization error:', error);
                this.buildDefaultMenu();
            }
        }

        async waitForAuth() {
            return new Promise((resolve) => {
                if (window.auth && window.auth.getUser()) {
                    resolve();
                    return;
                }

                let attempts = 0;
                const maxAttempts = 10;
                
                const checkAuth = setInterval(() => {
                    attempts++;
                    if (window.auth && window.auth.getUser()) {
                        clearInterval(checkAuth);
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkAuth);
                        console.warn('Auth not available, using default menu');
                        resolve();
                    }
                }, 100);
            });
        }

        buildMenu() {
            const role = this.user?.role || 'department_stationery';
            const items = MENU_CONFIG[role] || MENU_CONFIG.department_stationery;
            
            // Clear existing menu
            this.sidebarNav.innerHTML = '';
            
            // Add menu items
            items.forEach(item => {
                const menuItem = this.createMenuItem(item);
                this.sidebarNav.appendChild(menuItem);
            });
            
            // Add user info and logout
            this.addUserSection();
        }

        buildDefaultMenu() {
            const items = MENU_CONFIG.department_stationery;
            this.sidebarNav.innerHTML = '';
            
            items.forEach(item => {
                const menuItem = this.createMenuItem(item);
                this.sidebarNav.appendChild(menuItem);
            });
            
            this.addUserSection();
        }

        createMenuItem(item) {
            const a = document.createElement('a');
            a.href = item.page;
            a.className = 'nav-item';
            a.innerHTML = `
                <i class="${item.icon} nav-icon"></i>
                <span class="nav-label">${item.label}</span>
            `;
            
            a.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    this.closeMobileMenu();
                }
            });
            
            return a;
        }

        addUserSection() {
            const divider = document.createElement('div');
            divider.className = 'nav-divider';
            this.sidebarNav.appendChild(divider);
            
            // User info
            const userInfo = document.createElement('div');
            userInfo.className = 'nav-item';
            userInfo.style.pointerEvents = 'none';
            
            const userName = this.user?.displayName || this.user?.username || 'User';
            const userRole = this.user?.role || 'Staff';
            
            userInfo.innerHTML = `
                <i class="fas fa-user-circle nav-icon"></i>
                <div style="display: flex; flex-direction: column;">
                    <span class="nav-label" style="font-weight: 600;">${userName}</span>
                    <small style="opacity: 0.8; font-size: 12px;">${userRole.replace('_', ' ').toUpperCase()}</small>
                </div>
            `;
            this.sidebarNav.appendChild(userInfo);
            
            // Logout button
            const logoutItem = document.createElement('a');
            logoutItem.href = '#';
            logoutItem.className = 'nav-item logout-item';
            logoutItem.innerHTML = `
                <i class="fas fa-sign-out-alt nav-icon"></i>
                <span class="nav-label">Logout</span>
            `;
            
            logoutItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
            
            this.sidebarNav.appendChild(logoutItem);
        }

        handleLogout() {
            if (confirm('Are you sure you want to logout?')) {
                if (window.auth && typeof window.auth.logout === 'function') {
                    window.auth.logout()
                        .then(() => {
                            window.location.href = 'login.html';
                        })
                        .catch(() => {
                            window.location.href = 'login.html';
                        });
                } else {
                    window.location.href = 'login.html';
                }
            }
        }

        highlightCurrentPage() {
            const currentPage = window.location.pathname.split('/').pop() || 'admin.html';
            const navItems = this.sidebarNav.querySelectorAll('.nav-item:not(.logout-item)');
            
            navItems.forEach(item => {
                const href = item.getAttribute('href');
                if (href === currentPage) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }

        setupMobileMenu() {
            if (!this.menuToggle || !this.sidebar || !this.sidebarOverlay) {
                return;
            }

            this.menuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });

            this.sidebarOverlay.addEventListener('click', () => {
                this.closeMobileMenu();
            });

            // Close menu when window resizes to desktop
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    this.closeMobileMenu();
                }
            });
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

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        const menuManager = new MenuManager();
        menuManager.initialize();
    });

    // Make MenuManager available globally
    window.MenuManager = MenuManager;

})();