/**
 * Fix frontend API contract to match backend routes
 * Run ONCE
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_JS_DIR = path.join(__dirname, '../frontend/js');

const REPLACEMENTS = [
  // POS → Inventory
  { from: /\/pos\/products\//g, to: '/products/' },

  // POS learners
  { from: /\/pos\/learners\/search/g, to: '/learners/search' },
  { from: /\/pos\/learners\/class\//g, to: '/learners/class/' },
  { from: /\/pos\/learners\//g, to: '/learners/' },

  // POS misc
  { from: /\/pos\/classes/g, to: '/classes' },
  { from: /\/pos\/departments/g, to: '/departments' },
  { from: /\/pos\/search/g, to: '/search' },
  { from: /\/pos\/checkout/g, to: '/checkout' },
  { from: /\/pos\/lookup\//g, to: '/lookup/' },
  { from: /\/pos\/product\/sku\//g, to: '/product/sku/' },
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  REPLACEMENTS.forEach(r => {
    content = content.replace(r.from, r.to);
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✔ Fixed ${path.basename(filePath)}`);
  }
}

fs.readdirSync(FRONTEND_JS_DIR)
  .filter(f => f.endsWith('.js'))
  .forEach(f => fixFile(path.join(FRONTEND_JS_DIR, f)));

console.log('\nFrontend API contract fixed.');
