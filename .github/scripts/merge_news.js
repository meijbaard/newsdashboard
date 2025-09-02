const fs = require("fs");

const [existingFile, newFile] = process.argv.slice(2);

if (!existingFile || !newFile) {
  console.error("Usage: node merge_news.js <existing.json> <new.json>");
  process.exit(1);
}

// Lees bestaande artikelen
let existing = [];
if (fs.existsSync(existingFile)) {
  existing = JSON.parse(fs.readFileSync(existingFile, "utf-8"));
}

// Lees nieuwe artikelen
const incoming = JSON.parse(fs.readFileSync(newFile, "utf-8"));

// Voeg nieuwe artikelen toe, voorkom dubbele titels
const combined = [...existing];

incoming.forEach((item) => {
  // Dubbele titel check
  if (!combined.some((e) => e.title === item.title)) {
    // source_id primair link
    item.source_id = item.link || item.source_id || "Onbekende bron";
    combined.push(item);
  }
});

// Sorteer op datum, nieuwste eerst
combined.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

// Schrijf terug
fs.writeFileSync(existingFile, JSON.stringify(combined, null, 2));
console.log(`Merged ${incoming.length} articles into ${existingFile}`);
