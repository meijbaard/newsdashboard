const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

// === INSTELLINGEN VOOR GEBRUIKERS ===
// 1. Pas deze regex aan naar jouw eigen naam of zoekterm
const searchRegex = /JOUW_NAAM_HIER/i;

// 2. Voeg hier de directe RSS-feeds toe van je lokale of regionale media (voor de beste kwaliteit foto's/links)
const directFeeds = [
    // Voorbeeld:
    // { url: 'https://www.jouwlokalekrant.nl/rss', source_id: 'jouwlokalekrant.nl' },
    // { url: 'https://www.lokaleomroep.nl/rss/nieuws.xml', source_id: 'lokaleomroep.nl' }
];
// ===================================

const googleUrl = process.env.RSS_FEED_URL;
const dataFile = '_data/news.json';

function flattenData(data) {
    if (!Array.isArray(data)) return [];
    return data.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenData(val)) : acc.concat(val), []);
}

function getDomain(urlStr) {
    if (!urlStr) return null;
    try { return new URL(urlStr).hostname.replace('www.', ''); } catch (e) { return null; }
}

function removeBrandSuffix(title) {
    if (!title) return "";
    let clean = title.replace(/\s+-\s+[^-]+$/, ''); // Stript generieke toevoegingen zoals " - Krantnaam"
    return clean.trim();
}

function getDedupKey(title) {
    if (!title) return "onbekend";
    return title.toLowerCase().trim();
}

// Stofzuigerfunctie om te voorkomen dat Jekyll crasht op verborgen of illegale tekens
function cleanText(text) {
    if (!text) return "";
    return text.toString()
        .replace(/<[^>]*>?/gm, '') 
        .replace(/&nbsp;/g, ' ') 
        .replace(/&quot;/g, '"')
        .replace(/[\n\r\t]/g, ' ') 
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") 
        .trim();
}

function getImageUrl(item) {
    if (item.enclosure) {
        const enc = Array.isArray(item.enclosure) ? item.enclosure[0] : item.enclosure;
        if (enc && enc['@_url']) return enc['@_url'];
    }
    if (item['media:content']) {
        const mc = Array.isArray(item['media:content']) ? item['media:content'][0] : item['media:content'];
        if (mc && mc['@_url']) return mc['@_url'];
    }
    return "";
}

async function fetchAndParseXML(url) {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
        if (!response.ok) return [];
        const xmlData = await response.text();
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
        const jsonObj = parser.parse(xmlData);
        let items = jsonObj.rss?.channel?.item || [];
        return Array.isArray(items) ? items : [items];
    } catch (e) {
        return [];
    }
}

async function updateNews() {
    try {
        const allUniqueArticles = new Map();
        let existingArticles = [];
        if (fs.existsSync(dataFile)) {
            existingArticles = flattenData(JSON.parse(fs.readFileSync(dataFile, 'utf-8')));
        }

        existingArticles.forEach(article => {
            if (article.source_id && (!article.source_id.includes('.') || article.source_id === 'news.google.com')) {
                article.source_id = getDomain(article.link) || article.source_id;
            }
            if (article.pubDate && typeof article.pubDate === 'string' && !article.pubDate.includes('T')) {
                const parsedDate = new Date(article.pubDate.replace(" ", "T") + "Z");
                if (!isNaN(parsedDate)) article.pubDate = parsedDate.toISOString();
            }
            
            article.title = removeBrandSuffix(cleanText(article.title));
            article.description = cleanText(article.description);
            
            if (Array.isArray(article.creator) && article.creator.length === 0) {
                delete article.creator;
            }
            
            if (article.title) allUniqueArticles.set(getDedupKey(article.title), article);
        });

        // Verwerk directe premium feeds
        for (const feed of directFeeds) {
            const items = await fetchAndParseXML(feed.url);
            for (const item of items) {
                const rawTitle = cleanText(item.title);
                const rawDesc = cleanText(item.description);
                
                if (searchRegex.test(rawTitle) || searchRegex.test(rawDesc)) {
                    const title = removeBrandSuffix(rawTitle);
                    const key = getDedupKey(title);
                    
                    if (!allUniqueArticles.has(key) || allUniqueArticles.get(key).source_id === 'news.google.com') {
                        const newArticle = {
                            title: title, link: item.link || "",
                            pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                            source_id: feed.source_id, description: rawDesc, image_url: getImageUrl(item)
                        };
                        if (item.author && cleanText(item.author) !== "") newArticle.creator = [cleanText(item.author)];
                        allUniqueArticles.set(key, newArticle);
                    }
                }
            }
        }

        // Verwerk Google Nieuws vangnet
        if (googleUrl) {
            const googleItems = await fetchAndParseXML(googleUrl);
            for (const item of googleItems) {
                const title = removeBrandSuffix(cleanText(item.title));
                const key = getDedupKey(title);

                if (!allUniqueArticles.has(key)) {
                    let sourceDomain = "Onbekende bron";
                    if (item.source && item.source['@_url']) sourceDomain = getDomain(item.source['@_url']) || "Onbekende bron";

                    let fallbackDesc = cleanText(item.description);
                    if (fallbackDesc.includes('  ')) fallbackDesc = fallbackDesc.split('  ')[0].trim();
                    if (fallbackDesc.includes("Uitgebreide up-to-date")) fallbackDesc = "";

                    const newArticle = {
                        title: title, link: item.link || "",
                        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                        source_id: sourceDomain, description: fallbackDesc, image_url: getImageUrl(item)
                    };
                    if (item.author && cleanText(item.author) !== "") newArticle.creator = [cleanText(item.author)];
                    allUniqueArticles.set(key, newArticle);
                }
            }
        }

        const combined = Array.from(allUniqueArticles.values());
        combined.sort((a, b) => {
            const dateA = new Date(a.pubDate).getTime();
            const dateB = new Date(b.pubDate).getTime();
            if (isNaN(dateA) && isNaN(dateB)) return 0;
            if (isNaN(dateA)) return 1;  
            if (isNaN(dateB)) return -1; 
            return dateB - dateA;
        });

        fs.writeFileSync(dataFile, JSON.stringify(combined, null, 2));
    } catch (error) {
        console.error("Fout:", error);
        process.exit(1);
    }
}
updateNews();
