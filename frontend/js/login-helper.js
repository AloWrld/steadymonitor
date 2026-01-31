// Login helper - to be added to login.html
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        console.warn('Login form not found');
        return;
    }
    
    // Check if already logged in
    if (window.auth && window.auth.user) {
        window.auth.redirectByRole(window.auth.user);
        return;
    }
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const errorDiv = document.getElementById('loginError');
        
        // FIX: Declare originalText at the top of the function scope
        let originalText = submitBtn ? submitBtn.textContent : 'Login';
        
        if (!username || !password) {
            showError('Please enter username and password');
            return;
        }
        
        // Show loading
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitBtn.disabled = true;
        }
        
        if (errorDiv) errorDiv.style.display = 'none';
        
        try {
            // Use window.auth if available, otherwise use API directly
            if (window.auth && window.auth.login) {
                await window.auth.login(username, password);
            } else if (window.API) {
                const response = await window.API.login(username, password);
                if (response && response.success) {
                    // Use goToPage or hash navigation instead of direct file redirects
                    const role = response.user.role;
                    if (role === 'admin') {
                        if (typeof window.goToPage === 'function') {
                            goToPage('admin');
                        } else {
                            window.location.hash = '#admin';
                        }
                    } else if (role.startsWith('department_')) {
                        if (typeof window.goToPage === 'function') {
                            goToPage('department');
                        } else {
                            window.location.hash = '#department';
                        }
                    } else {
                        if (typeof window.goToPage === 'function') {
                            goToPage('pos');
                        } else {
                            window.location.hash = '#pos';
                        }
                    }
                } else {
                    throw new Error(response?.message || 'Login failed');
                }
            } else {
                throw new Error('API not available');
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Use a generic message for fetch/CORS errors
            const displayMsg = error.message.includes('fetch') || error.message.includes('Failed to fetch')
                ? 'Connection error: Backend is unreachable. Please check if backend is running.'
                : error.message || 'Login failed. Please check credentials.';
            
            showError(displayMsg);
            
            // Reset button (originalText is now accessible)
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
        
        function showError(message) {
            if (errorDiv) {
                errorDiv.textContent = message;
                errorDiv.style.display = 'block';
            } else {
                alert(message);
            }
        }
    });
    
    // Focus username field
    const usernameField = document.getElementById('username');
    if (usernameField) {
        usernameField.focus();
    }
});
