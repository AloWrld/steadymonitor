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
        
        if (!username || !password) {
            showError('Please enter username and password');
            return;
        }
        
        // Show loading
        if (submitBtn) {
            const originalText = submitBtn.textContent;
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
                    // Manual redirect based on role
                    const role = response.user.role;
                    if (role === 'admin') {
                        window.location.href = '/admin.html';
                    } else if (role.startsWith('department_')) {
                        window.location.href = '/department.html';
                    } else {
                        window.location.href = '/pos.html';
                    }
                } else {
                    throw new Error(response?.message || 'Login failed');
                }
            } else {
                throw new Error('API not available');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError(error.message || 'Login failed. Please check credentials.');
            
            // Reset button
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