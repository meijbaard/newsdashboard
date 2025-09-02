// .github/scripts/merge_news.js
const fs = require("fs");

const existingFile = "data/news.json";
const newFile = "new_articles.json";

// === Stap 1: Lees bestaande artikelen ===
let existing = [];
if (fs.existsSync(existingFile)) {
  const content = fs.readFileSync(existingFile, "utf8").trim();
  if (content.length > 0) {
    try {
      existing = JSON.parse(content);
    } catch (e) {
      console.error("⚠️ Waarschuwing: kon bestaande JSON niet parsen. Begin met lege array.");
      existing = [];
    }
  }
}

// === Stap 2: Lees nieuwe artikelen ===
let incoming = [];
try {
  incoming = JSON.parse(fs.readFileSync(newFile, "utf8"));
} catch (e) {
  console.error("❌ Fout: kon nieuwe artikelen niet parsen:", e);
  process.exit(1);
}

// === Stap 3: Merge, voorkom dubbele titels ===
const seenTitles = new Set(existing.map(a => a.title));
const merged = [...existing];

for (const article of incoming) {
  if (!seenTitles.has(article.title)) {
    merged.push(article);
    seenTitles.add(article.title);
  }
}

// === Stap 4: Schrijf resultaat terug ===
fs.writeFileSync(existingFile, JSON.stringify(merged, null, 2));
console.log(`✅ Merge voltooid: ${incoming.length} nieuw, totaal ${merged.length} artikelen`);
