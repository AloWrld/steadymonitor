// tools/update-frontend-api.js
const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '../frontend');
const JS_DIR = path.join(FRONTEND_DIR, 'js'); // optional if you have separate JS

// Mapping of old API calls → canonical API calls (from api.js)
const API_UPDATES = [
  // POS / Departments
  [/API\.getDepartments/g, 'API.pos.departments'],
  [/API\.getDepartmentProducts/g, 'API.pos.productsByDepartment'],

  // Auth
  [/API\.login/g, 'API.auth.login'],
  [/API\.logout/g, 'API.auth.logout'],
  [/API\.getPermissions/g, 'API.auth.permissions'],

  // Allocations / Customers
  [/API\.getCustomer/g, 'API.customer.get'],
  [/API\.getProgram/g, 'API.allocation.getProgram'],
  [/API\.getClassCustomers/g, 'API.customer.classCustomers'],

  // Payment / POS
  [/API\.getPaymentByCustomer/g, 'API.payment.byCustomer'],

  // Pocket Money
  [/API\.getPocketMoneyStatus/g, 'API.customer.pocketMoneyStatus'],

  // Any other legacy API references can go here
];

// Function to update file content
function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  API_UPDATES.forEach(([pattern, replacement]) => {
    content = content.replace(pattern, replacement);
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Updated ${path.relative(FRONTEND_DIR, filePath)}`);
}

// Update all HTML files
function updateHtmlFiles() {
  fs.readdirSync(FRONTEND_DIR).forEach(file => {
    if (file.endsWith('.html')) {
      const filePath = path.join(FRONTEND_DIR, file);
      updateFile(filePath);
    }
  });
}

// Update all JS files (optional, uncomment if needed)
function updateJsFiles() {
  if (!fs.existsSync(JS_DIR)) return;
  fs.readdirSync(JS_DIR).forEach(file => {
    if (file.endsWith('.js')) {
      const filePath = path.join(JS_DIR, file);
      updateFile(filePath);
    }
  });
}

console.log('🔧 Updating frontend HTML and JS API calls...');
updateHtmlFiles();
updateJsFiles(); // comment out if not needed
console.log('🎉 All frontend files updated with canonical API calls!');

