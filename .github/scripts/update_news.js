/**
 * update_news.js — Haalt nieuws op en werkt het archief bij.
 *
 * Garanties:
 *  - Er komt GEEN artikel in het archief zonder bewezen naamvermelding
 *    (meta-, body- of query-match). Een definitieve body-no-match wint
 *    altijd, ook van de Google-zoekfeed.
 *  - Eén kapotte feed blokkeert de rest niet.
 *  - Bij een schema-fout of verdacht krimpend archief wordt er NIETS
 *    weggeschreven (workflow faalt hard, oude data blijft intact).
 */

const fs = require("fs");
const lib = require("./newslib");

async function main() {
  const cfg = lib.loadConfig(process.argv[2]);
  const regex = lib.buildSearchRegex(cfg);
  const cache = lib.loadCache(cfg.cacheFile);
  const maxBodyChecks = cfg.maxBodyChecksPerRun ?? 40;
  let bodyChecksDone = 0;

  console.log(`Config: ${cfg._path} | zoektermen: ${cfg.searchTerms.join(", ")}`);

  /* ---- STAP 1: bestaand archief inlezen (en herstellen) ---- */
  const unique = new Map(); // dedupKey -> artikel
  if (fs.existsSync(cfg.dataFile)) {
    const existing = lib.flattenData(
      JSON.parse(fs.readFileSync(cfg.dataFile, "utf-8"))
    );
    for (const a of existing) {
      if (!a || !a.title) continue;
      a.title = lib.removeBrandSuffix(lib.cleanText(a.title));
      a.description = lib.cleanText(a.description);
      if (a.description === a.title) a.description = "";
      a.pubDate = lib.toIso(a.pubDate);
      if (a.source_id && !a.source_id.includes(".")) {
        a.source_id = lib.getDomain(a.link) || a.source_id;
      }
      if (Array.isArray(a.creator) && a.creator.filter(Boolean).length === 0) {
        delete a.creator;
      }
      if (!a.match) a.match = "archive"; // gesaneerd archief is al gevalideerd
      unique.set(lib.getDedupKey(a.title), a);
    }
    console.log(`=> Bestaand archief: ${unique.size} artikelen.`);
  }
  const existingCount = unique.size;
  let added = 0;

  /* ---- helper: beslis of een kandidaat erin mag ---- */
  async function admit(article, { trustedQuery = false } = {}) {
    // Laag 1: naam in titel of beschrijving
    if (regex.test(article.title) || regex.test(article.description)) {
      article.match = "meta";
      return true;
    }
    // Laag 2: naam in de artikelpagina zelf
    if (bodyChecksDone < maxBodyChecks) {
      bodyChecksDone++;
      const verdict = await lib.bodyCheck(article.link, regex, cache);
      if (verdict === "match") {
        article.match = "body";
        return true;
      }
      if (verdict === "nomatch") return false; // definitief: naam ontbreekt
    }
    // Niet verifieerbaar: alleen toelaten als de bron een zoekfeed
    // op de naam zelf is (relevantie door de query gegarandeerd).
    if (trustedQuery) {
      article.match = "query";
      return true;
    }
    return false;
  }

  /* ---- STAP 2: directe krantenfeeds ---- */
  for (const feed of cfg.directFeeds || []) {
    try {
      const items = await lib.fetchFeedItems(feed.url);
      console.log(`=> ${feed.source_id}: ${items.length} items in feed.`);
      for (const item of items) {
        const article = lib.normalizeItem(item, feed.source_id);
        if (!article.title || !article.link) continue;
        const key = lib.getDedupKey(article.title);
        if (unique.has(key)) continue;
        if (await admit(article, { trustedQuery: false })) {
          unique.set(key, article);
          added++;
          console.log(`   + ${article.title} [${article.match}]`);
        }
      }
    } catch (e) {
      console.error(`   ! Feed ${feed.source_id} overgeslagen: ${e.message}`);
    }
  }

  /* ---- STAP 3: Google Nieuws-zoekfeed (vangnet) ---- */
  const googleUrl = process.env[cfg.googleFeedEnv || "RSS_FEED_URL"];
  if (googleUrl) {
    try {
      const items = await lib.fetchFeedItems(googleUrl);
      console.log(`=> Google-zoekfeed: ${items.length} items.`);
      for (const item of items) {
        const article = lib.normalizeItem(item, "");
        if (!article.title) continue;
        const key = lib.getDedupKey(article.title);
        if (unique.has(key)) continue;
        // Redirect oplossen naar de echte artikel-URL (mooiere links,
        // betrouwbare bron én body-check mogelijk).
        article.link = await lib.resolveGoogleLink(article.link);
        const domain = lib.getDomain(article.link);
        if (domain && domain !== "news.google.com") article.source_id = domain;
        if (await admit(article, { trustedQuery: cfg.googleFeedIsNameQuery !== false })) {
          unique.set(key, article);
          added++;
          console.log(`   + ${article.title} [${article.match}]`);
        }
      }
    } catch (e) {
      console.error(`   ! Google-zoekfeed overgeslagen: ${e.message}`);
    }
  } else {
    console.log("=> Geen Google-zoekfeed geconfigureerd (RSS_FEED_URL leeg).");
  }

  /* ---- STAP 4: valideren en wegschrijven ---- */
  const combined = lib.sortByDateDesc(Array.from(unique.values()));

  if (existingCount > 20 && combined.length < existingCount * 0.7 && !process.env.FORCE) {
    throw new Error(
      `Veiligheidsstop: archief zou krimpen van ${existingCount} naar ` +
        `${combined.length}. Zet FORCE=1 als dit bewust is.`
    );
  }

  lib.writeArticles(cfg.dataFile, combined);
  lib.saveCache(cfg.cacheFile, cache);
  console.log(
    `\nKlaar: ${added} nieuw, totaal ${combined.length} artikelen ` +
      `(${bodyChecksDone} body-checks deze run).`
  );
}

main().catch((e) => {
  console.error(`FOUT: ${e.message}`);
  process.exit(1);
});
