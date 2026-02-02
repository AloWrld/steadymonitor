
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
