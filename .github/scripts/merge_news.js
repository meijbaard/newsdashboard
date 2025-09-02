#!/usr/bin/env node

const fs = require("fs");

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Gebruik: merge_news.js <bestand_news.json> <bestand_new_articles.json>");
  process.exit(1);
}

const existingFile = args[0];
const newFile = args[1];

let existing = [];
let incoming = [];

try {
  const data = fs.readFileSync(existingFile, "utf-8");
  existing = JSON.parse(data);
} catch (err) {
  console.warn("⚠️ Bestaande news.json niet te parsen. Begin met lege array.");
}

try {
  const data = fs.readFileSync(newFile, "utf-8");
  incoming = JSON.parse(data);
} catch (err) {
  console.error(`❌ Kan ${newFile} niet lezen of parsen: ${err.message}`);
  process.exit(1);
}

// Voeg alleen artikelen toe met unieke titel
const existingTitles = existing.map(function(a) { return a.title; });
const uniqueNew = incoming.filter(function(a) {
  return existingTitles.indexOf(a.title) === -1;
});

const merged = existing.concat(uniqueNew);

// console.log("✅ Merge voltooid: " + uniqueNew.length + " nieuw, totaal " + merged.length + " artikelen");
// console.log(JSON.stringify(merged, null, 2));

fs.writeFileSync(existingFile, JSON.stringify(merged, null, 2), "utf-8");
