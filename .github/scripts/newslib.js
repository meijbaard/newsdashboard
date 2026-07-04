/**
 * newslib.js — Gedeelde kernbibliotheek voor het nieuwsdashboard.
 *
 * Verantwoordelijkheden:
 *  - Feeds ophalen (met timeout, retry en per-feed fouttolerantie)
 *  - Artikelen normaliseren (schone titel, ISO-datum, domein als bron)
 *  - TWEE-LAAGS NAAMFILTER:
 *      Laag 1: naam in titel/beschrijving  -> match: "meta"
 *      Laag 2: naam in de artikelpagina    -> match: "body" (met cache)
 *      Google-zoekfeed op de naam zelf     -> match: "query" (alleen als
 *               de pagina niet verifieerbaar is; definitieve no-match wint)
 *  - Ontdubbeling op genormaliseerde titel
 *  - Schema-validatie vóór wegschrijven (nooit meer geneste arrays)
 *
 * Vereist Node 20+ (native fetch) en fast-xml-parser.
 */

const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/* ----------------------------------------------------------------
   Configuratie
---------------------------------------------------------------- */

function loadConfig(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.NEWS_CONFIG,
    "config.json",
    ".github/news.config.json",
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const cfg = JSON.parse(fs.readFileSync(p, "utf-8"));
      if (!Array.isArray(cfg.searchTerms) || cfg.searchTerms.length === 0) {
        throw new Error(`Config ${p}: "searchTerms" ontbreekt of is leeg.`);
      }
      if (!cfg.dataFile) throw new Error(`Config ${p}: "dataFile" ontbreekt.`);
      cfg._path = p;
      return cfg;
    }
  }
  throw new Error(
    "Geen config gevonden (config.json of .github/news.config.json)."
  );
}

function buildSearchRegex(cfg) {
  const escaped = cfg.searchTerms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  return new RegExp(escaped.join("|"), "i");
}

/* ----------------------------------------------------------------
   HTTP met timeout + retry
---------------------------------------------------------------- */

async function fetchUrl(url, { timeoutMs = 12000, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: ctl.signal,
        headers: {
          "User-Agent": UA,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.6",
        },
      });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

/* ----------------------------------------------------------------
   Tekst-/datahygiëne
---------------------------------------------------------------- */

function cleanText(text) {
  if (!text) return "";
  return text
    .toString()
    .replace(/<[^>]*>?/gm, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[\n\r\t]/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function removeBrandSuffix(title) {
  if (!title) return "";
  // Knipt " - Krantnaam" van het einde (door Google Nieuws toegevoegd).
  return title.replace(/\s+[-–|]\s+[^-–|]{2,60}$/, "").trim() || title.trim();
}

function getDedupKey(title) {
  if (!title) return "onbekend";
  return removeBrandSuffix(title)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDomain(urlStr) {
  if (!urlStr) return null;
  try {
    return new URL(urlStr).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function toIso(dateStr) {
  if (!dateStr) return new Date().toISOString();
  let d = new Date(dateStr);
  if (isNaN(d)) d = new Date(String(dateStr).replace(" ", "T") + "Z");
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
}

function getImageUrl(item) {
  const pick = (v) => {
    const o = Array.isArray(v) ? v[0] : v;
    return o && o["@_url"] ? o["@_url"] : "";
  };
  return (
    pick(item.enclosure) ||
    pick(item["media:content"]) ||
    pick(item["media:thumbnail"]) ||
    ""
  );
}

/* ----------------------------------------------------------------
   Feeds parsen
---------------------------------------------------------------- */

async function fetchFeedItems(url) {
  const res = await fetchUrl(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} voor feed ${url}`);
  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const obj = parser.parse(xml);
  let items =
    obj?.rss?.channel?.item ?? obj?.feed?.entry ?? [];
  if (!Array.isArray(items)) items = [items];
  return items.filter(Boolean);
}

function normalizeItem(item, sourceIdHint) {
  const rawTitle = cleanText(item.title?.["#text"] ?? item.title);
  const title = removeBrandSuffix(rawTitle);
  let link = item.link || "";
  if (typeof link === "object") link = link["@_href"] || link["#text"] || "";

  let source_id = sourceIdHint || "";
  if (!source_id && item.source && item.source["@_url"]) {
    source_id = getDomain(item.source["@_url"]) || "";
  }
  if (!source_id) source_id = getDomain(link) || "Onbekende bron";

  let description = cleanText(item.description ?? item.summary ?? "");
  // Google Nieuws stopt vaak alleen (een lijst van) titels in de beschrijving.
  if (description === title || description.startsWith(title)) description = "";
  if (description.includes("Uitgebreide up-to-date")) description = "";

  const article = {
    title,
    link,
    pubDate: toIso(item.pubDate ?? item.published ?? item.updated),
    source_id,
    description,
    image_url: getImageUrl(item),
  };
  const author = cleanText(item.author?.name ?? item.author ?? item["dc:creator"]);
  if (author) article.creator = [author];
  return article;
}

/* ----------------------------------------------------------------
   Google Nieuws-redirects oplossen naar de echte artikel-URL
---------------------------------------------------------------- */

async function resolveGoogleLink(link) {
  if (!/news\.google\./.test(link)) return link;
  try {
    const res = await fetchUrl(link, { timeoutMs: 10000, retries: 1 });
    const finalUrl = res.url || link;
    if (!/news\.google\./.test(finalUrl)) return finalUrl;
    // JS-redirectpagina: probeer de doel-URL uit de HTML te vissen.
    const html = await res.text();
    const m =
      html.match(/data-n-au="(https?:\/\/[^"]+)"/) ||
      html.match(/<a[^>]+href="(https?:\/\/(?!news\.google)[^"]+)"/);
    if (m) return m[1];
  } catch {
    /* laat origineel staan */
  }
  return link;
}

/* ----------------------------------------------------------------
   Laag 2: body-check met cache
   Resultaat: "match" | "nomatch" | "unverifiable"
---------------------------------------------------------------- */

function loadCache(cacheFile) {
  try {
    if (cacheFile && fs.existsSync(cacheFile)) {
      return JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    }
  } catch {
    /* corrupte cache negeren */
  }
  return {};
}

function saveCache(cacheFile, cache) {
  if (!cacheFile) return;
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 1));
}

function looksLikeConsentWall(html) {
  const small = html.length < 30000;
  const markers =
    /cookiewall|consent|privacy-gate|didomi|cmp__|akkoord met het gebruik van cookies/i;
  return small && markers.test(html);
}

async function bodyCheck(url, regex, cache) {
  if (!url || !/^https?:\/\//.test(url)) return "unverifiable";
  if (cache[url] && cache[url].result) return cache[url].result;

  let result = "unverifiable";
  try {
    const res = await fetchUrl(url, { timeoutMs: 15000, retries: 1 });
    if (res.ok) {
      const html = await res.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ");
      if (regex.test(text)) {
        result = "match";
      } else if (looksLikeConsentWall(text)) {
        result = "unverifiable"; // paywall/cookiemuur: geen oordeel mogelijk
      } else if (text.length > 5000) {
        result = "nomatch"; // volwaardige pagina zónder naam: definitief nee
      }
    }
  } catch {
    result = "unverifiable";
  }

  cache[url] = { result, checkedAt: new Date().toISOString() };
  return result;
}

/* ----------------------------------------------------------------
   Schema-validatie — de poortwachter vóór elke schrijfactie
---------------------------------------------------------------- */

const REQUIRED_STRING_FIELDS = ["title", "link", "pubDate", "source_id"];

function validateArticles(articles, { requireMatch = false } = {}) {
  const errors = [];
  if (!Array.isArray(articles)) {
    return ["Data is geen array."];
  }
  const seen = new Map();
  articles.forEach((a, i) => {
    if (Array.isArray(a) || typeof a !== "object" || a === null) {
      errors.push(`Item ${i}: geen plat object (geneste array?).`);
      return;
    }
    for (const f of REQUIRED_STRING_FIELDS) {
      if (typeof a[f] !== "string" || a[f].trim() === "") {
        errors.push(`Item ${i} ("${a.title || "?"}"): veld "${f}" ontbreekt of is leeg.`);
      }
    }
    if (a.pubDate && isNaN(new Date(a.pubDate))) {
      errors.push(`Item ${i}: ongeldige pubDate "${a.pubDate}".`);
    }
    if (requireMatch && !["meta", "body", "query", "archive"].includes(a.match)) {
      errors.push(`Item ${i} ("${a.title}"): geen geldige "match"-herkomst.`);
    }
    const key = getDedupKey(a.title || "");
    if (seen.has(key)) {
      errors.push(`Item ${i}: dubbele titel met item ${seen.get(key)} ("${a.title}").`);
    } else {
      seen.set(key, i);
    }
  });
  return errors;
}

function flattenData(data) {
  if (!Array.isArray(data)) return [];
  return data.reduce(
    (acc, v) => (Array.isArray(v) ? acc.concat(flattenData(v)) : acc.concat(v)),
    []
  );
}

function sortByDateDesc(articles) {
  articles.sort((a, b) => {
    const da = new Date(a.pubDate).getTime();
    const db = new Date(b.pubDate).getTime();
    if (isNaN(da) && isNaN(db)) return 0;
    if (isNaN(da)) return 1;
    if (isNaN(db)) return -1;
    return db - da;
  });
  return articles;
}

function writeArticles(dataFile, articles) {
  const errors = validateArticles(articles, { requireMatch: true });
  if (errors.length) {
    throw new Error(
      `Schema-validatie GEFAALD, er wordt NIET geschreven:\n- ` +
        errors.slice(0, 15).join("\n- ")
    );
  }
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(articles, null, 2));
}

module.exports = {
  loadConfig,
  buildSearchRegex,
  fetchUrl,
  fetchFeedItems,
  normalizeItem,
  resolveGoogleLink,
  bodyCheck,
  loadCache,
  saveCache,
  cleanText,
  removeBrandSuffix,
  getDedupKey,
  getDomain,
  getImageUrl,
  toIso,
  flattenData,
  sortByDateDesc,
  validateArticles,
  writeArticles,
};
