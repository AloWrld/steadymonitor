/**
 * Frontend Static Compatibility Fixer
 * Safe to re-run.
 */

const fs = require("fs");
const path = require("path");

const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
const API_URL = "https://steadymonitor-backend.onrender.com/api";

const API_PATTERNS = [
  /http:\/\/localhost:3001\/api/gi,
  /http:\/\/localhost:3000\/api/gi,
  /(["'`])\/api\//gi
];

const ROUTE_WARN_PATTERNS = [
  /href=["']\/(?!\/)/gi,
  /fetch\(["']\/(?!\/)/gi,
  /history\.pushState/gi,
  /router\.push/gi
];

let changes = [];
let warnings = [];

function walk(dir) {
  return fs.readdirSync(dir).flatMap(file => {
    const full = path.join(dir, file);
    return fs.statSync(full).isDirectory()
      ? walk(full)
      : [full];
  });
}

function processFile(file) {
  const ext = path.extname(file);
  if (![".html", ".js", ".css"].includes(ext)) return;

  let content = fs.readFileSync(file, "utf8");
  let original = content;

  // Replace API calls
  API_PATTERNS.forEach(pat => {
    content = content.replace(pat, `$1${API_URL}/`);
  });

  // Detect bad routing
  ROUTE_WARN_PATTERNS.forEach(pat => {
    if (pat.test(original)) {
      warnings.push(`⚠️ Potential invalid route usage in ${file}`);
    }
  });

  if (content !== original) {
    fs.writeFileSync(file, content, "utf8");
    changes.push(`✔ Updated API paths in ${file}`);
  }
}

// 1️⃣ Ensure index.html
const loginPath = path.join(FRONTEND_DIR, "login.html");
const indexPath = path.join(FRONTEND_DIR, "index.html");

if (!fs.existsSync(indexPath) && fs.existsSync(loginPath)) {
  fs.renameSync(loginPath, indexPath);
  changes.push("✔ Renamed login.html → index.html");
}

if (!fs.existsSync(indexPath)) {
  warnings.push("❌ index.html not found in frontend/");
}

// 2️⃣ Walk & process files
walk(FRONTEND_DIR).forEach(processFile);

// 3️⃣ Report
console.log("\n===== FRONTEND STATIC FIX REPORT =====\n");

changes.forEach(c => console.log(c));
warnings.forEach(w => console.warn(w));

console.log("\nDone.\n");
