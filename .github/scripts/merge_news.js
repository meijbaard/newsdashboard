// merge_news.js
const fs = require('fs');
const path = require('path');

const newsPath = path.join(__dirname, '../data/news.json');          // bestaand archief
const newArticlesPath = path.join(__dirname, '../data/new_articles.json'); // nieuwe feed

// Stap 1: lees bestaande artikelen
let existingArticles = [];
try {
    const data = fs.readFileSync(newsPath, 'utf8');
    existingArticles = JSON.parse(data);
} catch (err) {
    console.warn('⚠️ Bestaande news.json niet te parsen. Begin met lege array.');
}

// Stap 2: lees nieuwe artikelen
let newArticles = [];
try {
    const data = fs.readFileSync(newArticlesPath, 'utf8');
    newArticles = JSON.parse(data);
} catch (err) {
    console.error('❌ Kan new_articles.json niet lezen of parsen:', err.message);
    process.exit(1);
}

// Stap 3: voeg alleen artikelen toe waarvan de titel nog niet bestaat
const existingTitles = new Set(existingArticles.map(a => a.title));
const articlesToAdd = newArticles.filter(a => !existingTitles.has(a.title));

// Stap 4: combineer
const combined = [...existingArticles, ...articlesToAdd];

// Stap 5: schrijf terug naar news.json
try {
    fs.writeFileSync(newsPath, JSON.stringify(combined, null, 2), 'utf8');
    console.log(`✅ Merge voltooid: ${articlesToAdd.length} nieuw, totaal ${combined.length} artikelen`);
} catch (err) {
    console.error('❌ Fout bij schrijven naar news.json:', err.message);
    process.exit(1);
}
