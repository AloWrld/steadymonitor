// tools/generate-api-contract.js
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../backend/routes');
const contract = {};

fs.readdirSync(routesDir).forEach(file => {
  const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
  const matches = content.matchAll(/router\.(get|post|put|delete)\(['"`](\/[^'"`]+)/g);

  for (const [, method, route] of matches) {
    const module = file.replace('Routes.js', '');
    contract[module] ??= [];
    contract[module].push({
      method: method.toUpperCase(),
      path: `/api${route}`
    });
  }
});

fs.writeFileSync(
  'frontend/js/api.contract.json',
  JSON.stringify(contract, null, 2)
);

console.log('✔ API contract generated');
