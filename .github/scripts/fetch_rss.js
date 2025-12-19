const fs = require('fs');
const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const url = process.env.RSS_FEED_URL;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: ""
    });
    const jsonObj = parser.parse(data);
    const items = jsonObj.rss.channel.item || [];
    
    // Zorg voor een array, ook als er maar 1 resultaat is
    const articles = (Array.isArray(items) ? items : [items]).map(item => ({
      title: item.title || "",
      link: item.link || "",
      pubDate: item.pubDate || "",
      description: item.description || "",
      // Google RSS zet de bron vaak in een apart veld 'source'
      source_id: item.source ? item.source['#text'] : "Google Nieuws",
      image_url: "", // Google RSS levert standaard geen directe afbeeldingslinks
      creator: [item.source ? item.source['#text'] : ""]
    }));

    fs.writeFileSync('new_articles.json', JSON.stringify(articles, null, 2));
    console.log(`Succes: ${articles.length} artikelen voorbereid.`);
  });
}).on('error', (err) => {
  console.error("Fout bij ophalen van Google News:", err.message);
  process.exit(1);
});
