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
            this.isMobile = window.innerWidth <= 768;
        }

        async initialize() {
            if (!this.sidebarNav) {
                console.warn('Sidebar nav element not found');
                return;
            }

            try {
                // Wait for auth to be ready
                await this.waitForAuth();
                
                // Get user info
                this.user = window.auth?.getUser() || { role: 'department_stationery', username: 'User' };
                
                // Build menu
                this.buildMenu();
                
                // Setup mobile menu
                this.setupMobileMenu();
                
                // Highlight current page
                this.highlightCurrentPage();
                
                // Setup window resize listener
                this.setupResizeListener();
                
                console.log('Menu initialized for user:', this.user?.role);
                
            } catch (error) {
                console.error('Menu initialization error:', error);
                this.buildDefaultMenu();
            }
        }

        async waitForAuth() {
            return new Promise((resolve) => {
                const check = () => {
                    if (window.auth && typeof window.auth.getUser === 'function') {
                        const user = window.auth.getUser();
                        if (user) {
                            this.user = user;
                            resolve();
                            return true;
                        }
                    }
                    return false;
                };

                if (check()) return;

                let attempts = 0;
                const maxAttempts = 50; // 5 seconds total
                const interval = setInterval(() => {
                    attempts++;
                    if (check() || attempts > maxAttempts) {
                        clearInterval(interval);
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
            a.setAttribute('role', 'menuitem');
            a.innerHTML = `
                <i class="${item.icon} nav-icon"></i>
                <span class="nav-label">${item.label}</span>
            `;
            
            // Add click handler for mobile
            a.addEventListener('click', (e) => {
                if (this.isMobile) {
                    this.closeMobileMenu();
                }
                
                // Highlight active item
                this.highlightCurrentPage();
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
            logoutItem.setAttribute('role', 'menuitem');
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
                showLoading(true);
                if (window.auth && typeof window.auth.logout === 'function') {
                    window.auth.logout()
                        .then(() => {
                            window.location.href = 'index.html';
                        })
                        .catch(() => {
                            window.location.href = 'index.html';
                        });
                } else {
                    window.location.href = 'index.html';
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
                    item.setAttribute('aria-current', 'page');
                } else {
                    item.classList.remove('active');
                    item.removeAttribute('aria-current');
                }
            });
        }

        setupMobileMenu() {
            if (!this.menuToggle || !this.sidebar || !this.sidebarOverlay) {
                console.warn('Mobile menu elements not found');
                return;
            }

            // Update aria attributes
            this.menuToggle.setAttribute('aria-expanded', 'false');
            this.menuToggle.setAttribute('aria-label', 'Toggle menu');
            
            this.menuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });

            this.sidebarOverlay.addEventListener('click', () => {
                this.closeMobileMenu();
            });

            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.sidebar.classList.contains('active')) {
                    this.closeMobileMenu();
                }
            });

            // Update mobile state
            this.updateMobileState();
        }

        setupResizeListener() {
            window.addEventListener('resize', () => {
                this.isMobile = window.innerWidth <= 768;
                this.updateMobileState();
                
                // Close mobile menu when resizing to desktop
                if (!this.isMobile && this.sidebar.classList.contains('active')) {
                    this.closeMobileMenu();
                }
            });
        }

        updateMobileState() {
            if (!this.sidebar) return;
            
            if (this.isMobile) {
                this.sidebar.classList.remove('active');
                if (this.sidebarOverlay) this.sidebarOverlay.classList.remove('active');
                document.body.classList.remove('no-scroll');
            }
        }

        toggleMobileMenu() {
            const isActive = this.sidebar.classList.contains('active');
            
            if (isActive) {
                this.closeMobileMenu();
            } else {
                this.openMobileMenu();
            }
        }

        openMobileMenu() {
            this.sidebar.classList.add('active');
            if (this.sidebarOverlay) {
                this.sidebarOverlay.classList.add('active');
                this.sidebarOverlay.setAttribute('aria-hidden', 'false');
            }
            this.menuToggle.setAttribute('aria-expanded', 'true');
            document.body.classList.add('no-scroll');
            
            // Trap focus in sidebar
            this.trapFocus();
        }

        closeMobileMenu() {
            this.sidebar.classList.remove('active');
            if (this.sidebarOverlay) {
                this.sidebarOverlay.classList.remove('active');
                this.sidebarOverlay.setAttribute('aria-hidden', 'true');
            }
            this.menuToggle.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('no-scroll');
            
            // Release focus trap
            this.menuToggle.focus();
        }

        trapFocus() {
            const focusableElements = this.sidebar.querySelectorAll(
                'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            if (focusableElements.length === 0) return;
            
            const firstFocusable = focusableElements[0];
            const lastFocusable = focusableElements[focusableElements.length - 1];
            
            firstFocusable.focus();
            
            const handleKeyDown = (e) => {
                if (e.key !== 'Tab') return;
                
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            };
            
            this.sidebar.addEventListener('keydown', handleKeyDown);
            
            // Store reference to remove listener later
            this.currentTrapHandler = handleKeyDown;
        }

        cleanup() {
            if (this.currentTrapHandler) {
                this.sidebar.removeEventListener('keydown', this.currentTrapHandler);
                this.currentTrapHandler = null;
            }
        }
    }

    // Global helper function
    function showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('active', show);
        }
    }

    // Single initialization point
    document.addEventListener('DOMContentLoaded', () => {
        const menuManager = new MenuManager();
        menuManager.initialize();
        
        // Make accessible globally
        window.menuManager = menuManager;
    });

    // Make MenuManager available globally
    window.MenuManager = MenuManager;

})();
