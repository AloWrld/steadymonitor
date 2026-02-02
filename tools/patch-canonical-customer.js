// tools/patch-canonical-customer.js
// Run: node tools/patch-canonical-customer.js

const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, '..', 'backend', 'services');
const backupDir = path.join(__dirname, '..', 'backend', 'services', 'backup');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

console.log('🔹 Patching all service files in:', servicesDir);

// Loop through all .js files in services
fs.readdirSync(servicesDir).forEach(file => {
  if (!file.endsWith('.js')) return;

  const filePath = path.join(servicesDir, file);
  const backupPath = path.join(backupDir, file + '.bak');

  // Backup original
  fs.copyFileSync(filePath, backupPath);

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace all occurrences of legacy ID variables
  // Handles destructured params in functions
  content = content.replace(/\bconst\s+\{\s*(learnerId|id)\s*\}\s*=\s*req\.params\b/g, 'const customerId = req.customerId');
  content = content.replace(/\bconst\s+\{\s*(learnerId|id)\s*\}\s*=\s*req\.body\b/g, 'const customerId = req.customerId');

  // Replace legacy name variables
  content = content.replace(/\bconst\s+\{\s*(name|customerName)\s*\}\s*=\s*req\.body\b/g, 'const customer_name = req.body.customer_name');

  // Replace direct SQL placeholders if needed
  content = content.replace(/\bWHERE\s+learner_id\s*=\s*\$1\b/g, 'WHERE customer_id = $1');
  content = content.replace(/\bWHERE\s+name\s*=\s*\$[0-9]+\b/g, 'WHERE customer_name = $1');

  // Save patched file
  fs.writeFileSync(filePath, content, 'utf8');

  console.log(`✅ Patched: ${file} (backup at ${backupPath})`);
});

console.log('🎯 All services patched for canonical customerId & customer_name!');
