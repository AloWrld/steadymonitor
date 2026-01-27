// update-responsive.js
const fs = require('fs');
const path = require('path');

// Template for responsive media queries to add
const RESPONSIVE_TEMPLATE = `
@media (max-width: 768px) {
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .page-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
    }
    
    .header-actions {
        flex-direction: column;
    }
    
    .nav-actions {
        flex-wrap: wrap;
    }
    
    .form-actions {
        flex-direction: column;
    }
    
    .form-actions .btn {
        width: 100%;
    }
    
    .top-nav {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
    }
    
    .nav-brand, .nav-actions {
        width: 100%;
    }
    
    .nav-actions {
        justify-content: center;
    }
}

@media (max-width: 480px) {
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .data-table {
        font-size: 0.875rem;
    }
    
    .action-buttons {
        flex-direction: column;
    }
}
`;

// Structural improvements to add
const STRUCTURAL_IMPROVEMENTS = {
    emptyState: `
.empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-muted);
}

.empty-state i {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.empty-state h3 {
    margin-bottom: 0.5rem;
    color: var(--text-primary);
}
`,
    tableResponsive: `
.table-responsive {
    overflow-x: auto;
    border-radius: var(--border-radius);
    border: 1px solid var(--border);
}
`,
    loadingStates: `
.loading {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
}

@keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
`
};

function updateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Check if responsive styles exist
    if (!content.includes('@media (max-width: 768px)')) {
        console.log(`   Adding responsive styles to ${path.basename(filePath)}`);
        
        // Find the closing </style> tag or create style block
        if (content.includes('<style>')) {
            content = content.replace(/<\/style>/, `${RESPONSIVE_TEMPLATE}\n</style>`);
        } else {
            // Add style block before </head>
            const styleBlock = `
    <style>
        /* Responsive styles */
        ${RESPONSIVE_TEMPLATE}
    </style>
`;
            content = content.replace('</head>', `${styleBlock}\n</head>`);
        }
        updated = true;
    }
    
    // Add missing structural improvements
    if (!content.includes('empty-state')) {
        content = content.replace(/<\/style>/, `${STRUCTURAL_IMPROVEMENTS.emptyState}\n</style>`);
        updated = true;
    }
    
    if (!content.includes('table-responsive') && content.includes('data-table')) {
        content = content.replace(/<\/style>/, `${STRUCTURAL_IMPROVEMENTS.tableResponsive}\n</style>`);
        updated = true;
    }
    
    if (updated) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`   ✅ Updated ${path.basename(filePath)}`);
    } else {
        console.log(`   ✅ ${path.basename(filePath)} already has improvements`);
    }
}

function updateAllFiles() {
    console.log('🔄 Updating files with responsiveness improvements...\n');
    
    const frontendDir = './frontend';
    const filesToUpdate = [
        'pos.html',
        'allocations.html',
        'customers.html',
        'inventory.html',
        'reports.html',
        'suppliers.html',
        'refunds.html',
        'pocket_money.html',
        'overview.html'
    ];
    
    filesToUpdate.forEach(file => {
        const filePath = path.join(frontendDir, file);
        if (fs.existsSync(filePath)) {
            updateFile(filePath);
        }
    });
    
    console.log('\n✨ Update complete!');
}

updateAllFiles();