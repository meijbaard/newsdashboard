# 📰 Persoonlijk Nieuws Dashboard

Dit project verzamelt automatisch nieuwsartikelen waarin een specifieke naam voorkomt en presenteert ze op een filterbare, doorzoekbare webpagina via GitHub Pages.

[Link naar de live demo-pagina](https://markeijbaard.nl/inhetnieuws/)

---

## ✨ Kenmerken

* **Twee-laags naamfilter**: een artikel komt er alleen in als de naam aantoonbaar voorkomt — in de titel/beschrijving (laag 1) óf in de artikelpagina zelf (laag 2, met cache). Niets glipt erdoorheen.
* **Poortwachter in CI**: elke workflow-run valideert het volledige archief (schema, datums, duplicaten, naamvermelding). Faalt de validatie, dan wordt er niets gepubliceerd.
* **Robuust**: per-feed fouttolerantie, timeout + retry, veiligheidsstop tegen onbedoeld krimpend archief.
* **Automatische updates**: elke 4 uur via GitHub Actions.
* **Moderne interface**: card grid met zoekveld, filter op bron én jaar, "Nieuw"-badges en "toon meer"-paginering.
* **XSS-veilig**: alle feeddata wordt als tekst gerenderd, nooit als HTML.
* **Volledig gratis**: draait op GitHub Actions & Pages.

---

## 🏗️ Architectuur

```
config.json                      ← zoektermen, feeds, bestandspaden
.github/scripts/newslib.js       ← gedeelde kernbibliotheek
.github/scripts/update_news.js   ← elke 4 uur: ophalen + filteren + mergen
.github/scripts/validate_news.js ← poortwachter: valideert vóór publicatie
.github/scripts/clean_archive.js ← eenmalige (her)sanering van het archief
data/news.json                   ← het gevalideerde archief
data/bodycheck_cache.json        ← cache van pagina-controles
data/review_articles.json        ← niet-verifieerbare artikelen (paywall)
```

Elk artikel in `data/news.json` heeft een `match`-veld dat de bewijsvoering vastlegt:
`meta` (naam in titel/beschrijving), `body` (naam in artikelpagina), `query` (afkomstig uit een Google Nieuws-zoekopdracht op de naam), of `archive` (handmatig goedgekeurd).

---

## 🚀 Installatie & Configuratie

### Stap 1: Repository opzetten

1. Maak een nieuwe **publieke** repository aan en zet alle bestanden erin.
2. Pas `config.json` aan: je eigen `searchTerms` en eventueel andere `directFeeds`.
3. Vervang `[HIER JE NAAM]` in `index.html`.

### Stap 2: Google Nieuws-zoekfeed (optioneel vangnet)

1. Maak via [RSS.app](https://rss.app/) of een vergelijkbare dienst een RSS-feed van een Google Nieuws-zoekopdracht **op je naam**.
2. Voeg de feed-URL toe als repository secret: **Settings > Secrets and variables > Actions**, naam `RSS_FEED_URL`.
3. Belangrijk: de zoekopdracht moet je naam bevatten. Alleen dan mag de pipeline niet-verifieerbare artikelen uit deze feed vertrouwen (`match: "query"`).

### Stap 3: GitHub Pages activeren

1. Ga naar **Settings > Pages** en kies bij "Source" de optie **GitHub Actions**.

### Stap 4: Live gaan

1. Push alles naar `main`.
2. Start de **Fetch News** workflow handmatig via het Actions-tabblad voor de eerste artikelen.

---

## 🧹 Archief opnieuw saneren

Draai lokaal (Node 20+):

```bash
npm install fast-xml-parser
node .github/scripts/clean_archive.js
```

Elk artikel wordt getoetst op naamvermelding. Verwijderde artikelen komen in `data/removed_articles.json`, niet-verifieerbare (paywall) in `data/review_articles.json`. Review-items die je wilt behouden zet je terug in `data/news.json` met `"match": "archive"`.
