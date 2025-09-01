#!/usr/bin/env node

const fs = require("fs");

const [existingFile, newFile] = process.argv.slice(2);

const existing = JSON.parse(fs.readFileSync(existingFile, "utf-8"));
const incoming = JSON.parse(fs.readFileSync(newFile, "utf-8"));

const merged = [...existing];
const existingTitles = new Set(existing.map(a => a.title));

incoming.forEach(article => {
  if (!existingTitles.has(article.title)) {
    merged.push(article);
  }
});

// Sorteer op publicatiedatum, nieuwste eerst
merged.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

fs.writeFileSync(existingFile, JSON.stringify(merged, null, 2));
