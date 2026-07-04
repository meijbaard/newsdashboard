/**
 * validate_news.js — CI-poortwachter.
 *
 * Controleert het datbestand en faalt (exit 1) als er ook maar één
 * artikel in zit dat niet aan de eisen voldoet:
 *  - plat JSON-array, geen geneste arrays
 *  - verplichte velden aanwezig (title, link, pubDate, source_id)
 *  - geldige ISO-datums
 *  - geen dubbele titels
 *  - elk artikel heeft een geldige match-herkomst (meta/body/query/archive)
 *  - elk meta-artikel bevat de zoekterm ook echt in titel/beschrijving
 */

const fs = require("fs");
const lib = require("./newslib");

const cfg = lib.loadConfig(process.argv[2]);
const regex = lib.buildSearchRegex(cfg);

const data = JSON.parse(fs.readFileSync(cfg.dataFile, "utf-8"));
const errors = lib.validateArticles(data, { requireMatch: true });

if (Array.isArray(data)) {
  data.forEach((a, i) => {
    if (
      a &&
      a.match === "meta" &&
      !(regex.test(a.title || "") || regex.test(a.description || ""))
    ) {
      errors.push(
        `Item ${i} ("${a.title}"): match="meta" maar zoekterm staat niet in titel/beschrijving.`
      );
    }
  });
}

if (errors.length) {
  console.error(`VALIDATIE GEFAALD (${errors.length} fouten):`);
  errors.slice(0, 25).forEach((e) => console.error(` - ${e}`));
  process.exit(1);
}
console.log(`Validatie OK: ${data.length} artikelen, allemaal met bewezen naamvermelding.`);
