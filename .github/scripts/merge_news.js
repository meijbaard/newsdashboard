#!/usr/bin/env node

const fs = require("fs");

const [existingFile, newFile] = process.argv.slice(2);

if (!existingFile || !newFile) {
  console.error("Gebruik: merge_news.js <bestand_news.json> <bestand_new_articles.json>");
  process.exit(1);
}

let existing = [];
let incoming = [];

try {
  existing = JSON.parse(fs.readFileSync(existingFile, "utf-8"));
} catch {
  console.warn("⚠️ Bestaande news.json niet te parsen. Begin met lege array.");
}

try {
  incoming = JSON.parse(fs.readFileSync(newFile, "utf-8"));
} catch (err) {
  console.error(`❌ Kan ${newFile} niet lezen of parsen:`, err.message);
  process.exit(1);
}

// Voeg alleen nieuwe artikelen toe op basis van unieke titel
const existingTitles = new Set(existing.map(a => a.title));
const uniqueNew = incoming.filter(a => !existingTitles.has(a.title));

const merged = [...existing, ...uniqueNew];

console.log(`✅ Merge voltooid: ${uniqueNew.length} nieuw, totaal ${merged.length} artikelen`);
console.log(JSON.stringify(merged, null, 2));
