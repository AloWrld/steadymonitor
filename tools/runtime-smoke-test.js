// tools/runtime-smoke-test.js


const BASE = 'http://localhost:3000/api';

const endpoints = [
  '/inventory',
  '/customers',
  '/payments',
  '/pos',
];

(async () => {
  for (const ep of endpoints) {
    try {
      const res = await fetch(BASE + ep, { credentials: 'include' });
      const json = await res.json();
      console.log(`\n${ep}`);
      console.log('Keys:', Object.keys(json));
      if (json.rows) console.log('Rows:', json.rows.length);
      if (json.data) console.log('Data:', json.data.length);
    } catch (e) {
      console.error(`❌ ${ep} failed`, e.message);
    }
  }
})();
