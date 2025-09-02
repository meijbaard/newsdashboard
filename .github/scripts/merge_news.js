#!/usr/bin/env node
const fs = require('fs');

const [existingFile, newFile] = process.argv.slice(2);

if (!existingFile || !newFile) {
  console.error("Gebruik: merge_news.js <bestaand.json> <nieuw.json>");
  process.exit(1);
}

let existing = [];
let incoming = [];

try {
  existing = JSON.parse(fs.readFileSync(existingFile, 'utf8'));
} catch {
  existing = [];
}

try {
  incoming = JSON.parse(fs.readFileSync(newFile, 'utf8'));
} catch {
  incoming = [];
}

// Voeg alleen nieuwe artikelen toe op basis van titel
const titles = new Set(existing.map(a => a.title));
const uniqueNew = incoming.filter(a => !titles.has(a.title));

const merged = [...existing, ...uniqueNew];

// Logging gecommentarieerd zodat news.json veilig blijft
// console.log("✅ Merge voltooid: " + uniqueNew.length + " nieuw, totaal " + merged.length + " artikelen");
// console.log(JSON.stringify(merged, null, 2));

fs.writeFileSync('temp_news.json', JSON.stringify(merged, null, 2));
