const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'db.json');
let db = fs.readFileSync(dbPath, 'utf-8');

// Multi-level mojibake cleanup
// Repeatedly apply until no more changes
const patterns = [
  [/ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â/g, '-'],
  [/ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â /g, '-'],
  [/ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡/g, '-'],
  [/ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“/g, '-'],
  [/ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡/g, '-'],
  [/ÃƒÆ’Ã¢â‚¬Å¡/g, '-'],
  [/Ãƒâ€šÃ‚Â/g, ''],
  [/Ã¢â‚¬â€/g, '-'],
  [/Ã¢â‚¬"/g, '-'],
  [/Ã¢â‚¬'/g, '-'],
  [/Ã¢â‚¬Å"/g, '-'],
  [/Ã¢â‚¬â„¢/g, "'"],
  [/Ã¢â‚¬Ëœ/g, "'"],
  [/Ã¢â‚¬Å"/g, '"'],
  [/Ã¢â‚¬/g, '"'],
  [/â€"/g, '-'],
  [/â€"/g, '-'],
  [/â€"/g, '-'],
  [/â€"/g, '-'],
  [/â€™/g, "'"],
  [/â€˜/g, "'"],
  [/â€œ/g, '"'],
  [/â€/g, '"'],
  [/Â /g, ' '],
  [/Â/g, ''],
];

// Apply repeatedly until stable
let prev = '';
let iterations = 0;
while (prev !== db && iterations < 10) {
  prev = db;
  for (const [pat, rep] of patterns) {
    db = db.replace(pat, rep);
  }
  iterations++;
}

// Also fix server.ts
const serverPath = path.join(__dirname, 'server.ts');
let server = fs.readFileSync(serverPath, 'utf-8');
prev = '';
iterations = 0;
while (prev !== server && iterations < 10) {
  prev = server;
  for (const [pat, rep] of patterns) {
    server = server.replace(pat, rep);
  }
  iterations++;
}

fs.writeFileSync(dbPath, db, 'utf-8');
fs.writeFileSync(serverPath, server, 'utf-8');

console.log('Fixed db.json and server.ts');
console.log('DB iterations:', iterations);
