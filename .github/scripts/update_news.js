const fs = require('fs');
const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const url = process.env.RSS_FEED_URL;
const dataFile = '_data/news.json';

// Functie om de oude, geneste JSON-structuur plat te slaan
function flattenData(data) {
    if (!Array.isArray(data)) return [];
    return data.reduce((acc, val) => 
        Array.isArray(val) ? acc.concat(flattenData(val)) : acc.concat(val), []
    );
}

// Haalt de schone domeinnaam uit een link
function getDomain(urlStr) {
    if (!urlStr) return null;
    try {
        return new URL(urlStr).hostname.replace('www.', '');
    } catch (e) {
        return null;
    }
}

// Slimme ontdubbelingssleutel: knipt " - Krantnaam" weg voor een eerlijke vergelijking
function getDedupKey(title) {
    return title.replace(/ - [^-]+$/, '').toLowerCase().trim();
}

https.get(url, (res) => {
    let xmlData = '';
    res.on('data', (chunk) => { xmlData += chunk; });
    res.on('end', () => {
        try {
            const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
            const jsonObj = parser.parse(xmlData);
            let items = jsonObj.rss?.channel?.item || [];
            if (!Array.isArray(items)) items = [items];

            const regex = /Eijbaard/i;

            const newArticles = items.map(item => {
                const title = item.title || "";
                const description = item.description || "";
                
                let sourceDomain = "Onbekende bron";
                if (item.source && item.source['@_url']) {
                    sourceDomain = getDomain(item.source['@_url']) || "Onbekende bron";
                }

                // Verwijder de door Google toegevoegde krantnaam uit de titel voor een strakke presentatie
                const cleanTitle = title.replace(/ - [^-]+$/, '').trim();

                return {
                    title: cleanTitle,
                    link: item.link || "",
                    pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                    source_id: sourceDomain,
                    description: description.replace(/<[^>]*>?/gm, '').trim(),
                    creator: [],
                    image_url: "" 
                };
            }).filter(item => regex.test(item.title) || regex.test(item.description));

            let existingArticles = [];
            if (fs.existsSync(dataFile)) {
                existingArticles = flattenData(JSON.parse(fs.readFileSync(dataFile, 'utf-8')));
            }

            const allUniqueArticles = new Map();

            // OUDE DATA EERST: Zo beschermen we jouw directe URL's tegen overschrijving
            existingArticles.forEach(article => {
                // Herstel auteursnamen naar domeinnamen
                if (article.source_id && !article.source_id.includes('.')) {
                    article.source_id = getDomain(article.link) || article.source_id;
                }
                
                // Normaliseer oude datumformaten (vervang spatie door T)
                if (article.pubDate && !article.pubDate.includes('T')) {
                    const parsedDate = new Date(article.pubDate.replace(" ", "T") + "Z");
                    if (!isNaN(parsedDate)) article.pubDate = parsedDate.toISOString();
                }
                
                if (article.title) {
                    allUniqueArticles.set(getDedupKey(article.title), article);
                }
            });

            // NIEUWE DATA ERBIJ: Voeg alleen toe als de schone titel nog niet in het archief zit
            newArticles.forEach(article => {
                if (article.title) {
                    const key = getDedupKey(article.title);
                    if (!allUniqueArticles.has(key)) {
                        allUniqueArticles.set(key, article);
                    }
                }
            });

            // Sorteren en wegschrijven
            const combined = Array.from(allUniqueArticles.values());
            combined.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

            fs.writeFileSync(dataFile, JSON.stringify(combined, null, 2));
            console.log(`Succes! Archief bevat nu ${combined.length} perfect schone artikelen.`);

        } catch (error) {
            console.error("Fout bij het verwerken:", error);
            process.exit(1);
        }
    });
}).on('error', (err) => {
    console.error("Fout bij ophalen XML:", err.message);
    process.exit(1);
});
