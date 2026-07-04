/**
 * clean_archive.js — Eenmalige (her)sanering van het bestaande archief.
 *
 * Elk artikel wordt getoetst:
 *  1. Naam in titel/beschrijving        -> behouden  (match: "meta")
 *  2. Naam in de artikelpagina (fetch)  -> behouden  (match: "body")
 *  3. Pagina bereikbaar, naam ontbreekt -> VERWIJDEREN
 *  4. Niet verifieerbaar (paywall/404)  -> naar reviewbestand
 *
 * Er gaat niets verloren: verwijderde en te-reviewen artikelen worden
 * apart weggeschreven. Draai met: node clean_archive.js [config.json]
 * Opties via env: CONCURRENCY (default 6)
 */

const fs = require("fs");
const lib = require("./newslib");

async function main() {
  const cfg = lib.loadConfig(process.argv[2]);
  const regex = lib.buildSearchRegex(cfg);
  const cache = lib.loadCache(cfg.cacheFile);
  const concurrency = parseInt(process.env.CONCURRENCY || "6", 10);

  const raw = lib.flattenData(JSON.parse(fs.readFileSync(cfg.dataFile, "utf-8")));
  console.log(`Archief: ${raw.length} artikelen. Saneren gestart...`);

  // Normaliseren + ontdubbelen
  const unique = new Map();
  for (const a of raw) {
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
    const key = lib.getDedupKey(a.title);
    const prev = unique.get(key);
    // Voorkeur voor het rijkste exemplaar (afbeelding/beschrijving aanwezig)
    if (!prev || (!prev.image_url && a.image_url) || (!prev.description && a.description)) {
      unique.set(key, a);
    }
  }
  const articles = Array.from(unique.values());
  console.log(`Na ontdubbeling: ${articles.length} artikelen.`);

  const keep = [];
  const removed = [];
  const review = [];

  // Laag 1 direct afhandelen; rest in de body-check-wachtrij
  const queue = [];
  for (const a of articles) {
    if (regex.test(a.title) || regex.test(a.description)) {
      a.match = "meta";
      keep.push(a);
    } else {
      queue.push(a);
    }
  }
  console.log(`Laag 1 (meta): ${keep.length} behouden, ${queue.length} naar body-check.`);

  let done = 0;
  async function worker() {
    while (queue.length) {
      const a = queue.shift();
      const verdict = await lib.bodyCheck(a.link, regex, cache);
      done++;
      if (done % 20 === 0) {
        lib.saveCache(cfg.cacheFile, cache); // tussentijds bewaren
        console.log(`   ... ${done} pagina's gecheckt`);
      }
      if (verdict === "match") {
        a.match = "body";
        keep.push(a);
      } else if (verdict === "nomatch") {
        removed.push(a);
      } else {
        review.push(a);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  lib.saveCache(cfg.cacheFile, cache);

  lib.writeArticles(cfg.dataFile, lib.sortByDateDesc(keep));

  const reviewFile = cfg.reviewFile || "data/review_articles.json";
  const removedFile = reviewFile.replace(/review/, "removed");
  fs.writeFileSync(reviewFile, JSON.stringify(lib.sortByDateDesc(review), null, 2));
  fs.writeFileSync(removedFile, JSON.stringify(lib.sortByDateDesc(removed), null, 2));

  console.log(`\n===== RESULTAAT =====`);
  console.log(`Behouden:     ${keep.length}  -> ${cfg.dataFile}`);
  console.log(`Verwijderd:   ${removed.length}  -> ${removedFile} (naam aantoonbaar afwezig)`);
  console.log(`Te reviewen:  ${review.length}  -> ${reviewFile} (paywall/niet bereikbaar)`);
  console.log(`\nReview-items kun je handmatig terugzetten in ${cfg.dataFile}`);
  console.log(`met "match": "archive" als je weet dat ze relevant zijn.`);
}

main().catch((e) => {
  console.error(`FOUT: ${e.message}`);
  process.exit(1);
});
