// analyze-csv-full.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const csvDir = path.join(__dirname, 'CSV');
const files = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'));

console.log('='.repeat(100));
console.log('STEADYMONITOR 2.0 - FULL CSV ANALYSIS');
console.log('='.repeat(100));

async function analyzeFile(file) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(csvDir, file);
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => {
        if (rows.length === 0) {
          resolve({ file, rows: 0, columns: [] });
          return;
        }

        const firstRow = rows[0];
        const columns = Object.keys(firstRow).map(col => {
          const values = rows.map(r => r[col]).filter(v => v && v.toString().trim() !== '');
          const sample = firstRow[col] || '';

          // Infer data type
          let type = 'TEXT';
          if (values.length > 0) {
            const testVal = values[0].toString().trim();
            if (testVal !== '') {
              const numTest = parseFloat(testVal.replace(/[^\d.-]/g, ''));
              if (!isNaN(numTest) && testVal.match(/^-?\d*\.?\d+$/)) {
                type = testVal.includes('.') ? 'DECIMAL' : 'INTEGER';
              } else if (!isNaN(Date.parse(testVal)) && testVal.length >= 8) {
                type = 'TIMESTAMP';
              } else if (['TRUE', 'FALSE'].includes(testVal.toUpperCase())) {
                type = 'BOOLEAN';
              }
            }
          }

          return {
            name: col.trim(),
            type,
            nonEmpty: values.length,
            total: rows.length,
            sample: sample.toString().substring(0, 40)
          };
        });

        resolve({ file, rows: rows.length, columns });
      })
      .on('error', reject);
  });
}

function generateTableSQL(tableName, columns) {
  console.log(`\n-- ========== ${tableName.toUpperCase()} TABLE ==========`);

  const columnDefs = [];
  let hasPrimaryKey = false;

  columns.forEach(col => {
    let sqlType;
    const colName = col.name.toLowerCase();

    switch (col.type) {
      case 'INTEGER': sqlType = 'INTEGER'; break;
      case 'DECIMAL': sqlType = 'DECIMAL(10,2)'; break;
      case 'TIMESTAMP': sqlType = 'TIMESTAMP'; break;
      case 'BOOLEAN': sqlType = 'BOOLEAN'; break;
      default:
        const isId = colName === 'id' || colName.includes('_id') || colName.endsWith('id') || colName === `${tableName}_id`;
        if (isId && !hasPrimaryKey && col.type === 'INTEGER') {
          sqlType = 'SERIAL PRIMARY KEY';
          hasPrimaryKey = true;
        } else {
          const len = col.sample ? col.sample.length : 0;
          sqlType = len <= 50 ? 'VARCHAR(100)' : len <= 100 ? 'VARCHAR(255)' : 'TEXT';
        }
    }

    const notNull = col.nonEmpty === col.total ? ' NOT NULL' : '';
    columnDefs.push(`  ${col.name} ${sqlType}${notNull}`);
  });

  if (!hasPrimaryKey) columnDefs.unshift(`  ${tableName}_id SERIAL PRIMARY KEY`);

  console.log(`CREATE TABLE ${tableName} (\n${columnDefs.join(',\n')}\n);`);

  if (columns.length > 0) {
    const colNames = columns.map(c => c.name).join(', ');
    console.log(`\n-- Sample INSERT (first row)\n-- INSERT INTO ${tableName} (${colNames}) VALUES (...);`);
  }
}

async function main() {
  console.log(`\n📊 Analyzing ${files.length} CSV files...\n`);

  const allTables = [];

  for (const file of files) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 FILE: ${file}`);
    console.log(`${'='.repeat(80)}`);

    try {
      const analysis = await analyzeFile(file);
      const tableName = file.replace('.csv', '').toLowerCase();

      console.log(`📈 Total Rows: ${analysis.rows}`);
      console.log(`🗂️  Total Columns: ${analysis.columns.length}`);

      if (analysis.columns.length > 0) {
        console.log('\nColumn Analysis:');
        console.log('─'.repeat(60));

        analysis.columns.forEach((col, i) => {
          const percent = Math.round((col.nonEmpty / analysis.rows) * 100);
          const status = percent === 100 ? '✅' : percent > 80 ? '⚠️ ' : '❌';
          console.log(`${status} ${(i + 1).toString().padStart(2)}. ${col.name.padEnd(25)} ${col.type.padEnd(10)} ${col.nonEmpty}/${analysis.rows} (${percent}%)`);
          console.log(`   Sample: "${col.sample}"`);
        });

        console.log('\n' + '💡'.repeat(40));
        console.log('POSTGRESQL TABLE SCHEMA:');
        console.log('💡'.repeat(40));
        generateTableSQL(tableName, analysis.columns);

        allTables.push({ name: tableName, rows: analysis.rows, columns: analysis.columns.length });
      }
    } catch (error) {
      console.error(`❌ Error analyzing ${file}:`, error.message);
    }
  }

  console.log('\n' + '🎯'.repeat(40));
  console.log('MIGRATION SUMMARY');
  console.log('🎯'.repeat(40));

  console.log('\nTables to create:');
  allTables.forEach((table, i) => {
    console.log(`  ${i + 1}. ${table.name.padEnd(20)} ${table.rows.toString().padStart(5)} rows, ${table.columns} columns`);
  });

  console.log('\n' + '📋'.repeat(40));
  console.log('NEXT STEPS:');
  console.log('1. Install PostgreSQL (if not installed)');
  console.log('2. Create database: createdb steadymonitor');
  console.log('3. Save the SQL schemas above to a file: node analyze-csv-full.js > schema.sql');
  console.log('4. Run: psql -d steadymonitor -f schema.sql');
  console.log('5. Create migration script to import CSV data (migrate-enhanced2.js)');
  console.log('📋'.repeat(40));
}

main().catch(console.error);
