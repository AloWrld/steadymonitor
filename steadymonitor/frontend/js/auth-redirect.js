
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
