/**
 * newsdashboard.js — laadt data/news.json en rendert het dashboard.
 *
 * Veiligheid: alle data wordt via textContent/setAttribute in de DOM
 * gezet, nooit via innerHTML. Feed-inhoud kan dus geen script injecteren.
 */
(function () {
  "use strict";

  var PAGE_SIZE = 24;

  var initialized = false;

  document.addEventListener("DOMContentLoaded", function () {
    if (initialized) return; // voorkom dubbele initialisatie
    initialized = true;
    var newsList = document.getElementById("news-list");
    var counter = document.getElementById("article-counter");
    var filterContainer = document.getElementById("filter-container");
    var searchInput = document.getElementById("news-search");
    var yearSelect = document.getElementById("year-filter");
    var loadMoreBtn = document.getElementById("load-more");
    var emptyMsg = document.getElementById("news-empty");
    var heroStats = document.getElementById("hero-stats");

    var state = { source: "all", year: "all", term: "", limit: PAGE_SIZE };
    var articles = [];

    fetch("data/news.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        articles = flatten(data).filter(function (a) {
          return a && typeof a === "object" && a.title;
        });
        if (!articles.length) return showEmptyState();
        init();
      })
      .catch(function (err) {
        console.error("Fout bij het ophalen van nieuws:", err);
        showEmptyState();
      });

    function flatten(data) {
      if (!Array.isArray(data)) return [];
      return data.reduce(function (acc, v) {
        return Array.isArray(v) ? acc.concat(flatten(v)) : acc.concat(v);
      }, []);
    }

    function showEmptyState() {
      counter.textContent = "0 artikelen gevonden.";
      emptyMsg.hidden = false;
      emptyMsg.textContent =
        "Er worden momenteel geen nieuwsberichten gevonden. De data wordt automatisch bijgewerkt.";
    }

    function init() {
      articles.forEach(function (a) {
        var d = new Date(a.pubDate || "");
        a._date = isNaN(d.getTime()) ? null : d;
        a._year = a._date ? String(a._date.getFullYear()) : null;
        a._text = (
          (a.title || "") + " " + (a.description || "") + " " + (a.source_id || "")
        ).toLowerCase();
        a._node = buildCard(a);
      });

      articles.forEach(function (a) { newsList.appendChild(a._node); });

      buildSourceButtons();
      buildYearOptions();
      buildHeroStats();
      bindEvents();
      apply();
    }

    /* ---- kaart opbouwen (XSS-veilig) ---- */
    function buildCard(a) {
      var li = document.createElement("li");
      li.className = "news-item";

      var media = document.createElement("div");
      media.className = "news-media";
      if (a.image_url) {
        var img = document.createElement("img");
        img.className = "news-image";
        img.loading = "lazy";
        img.alt = "";
        img.src = a.image_url;
        img.onerror = function () {
          media.classList.add("news-media--fallback");
          img.remove();
        };
        media.appendChild(img);
      } else {
        media.classList.add("news-media--fallback");
      }
      var tag = document.createElement("span");
      tag.className = "news-source-tag";
      tag.textContent = a.source_id || "Onbekende bron";
      media.appendChild(tag);
      li.appendChild(media);

      var content = document.createElement("div");
      content.className = "news-content";

      var h3 = document.createElement("h3");
      var link = document.createElement("a");
      var href = String(a.link || "#");
      link.href = /^https?:\/\//.test(href) ? href : "#";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = a.title || "Zonder titel";
      h3.appendChild(link);
      content.appendChild(h3);

      if (a.description) {
        var desc = document.createElement("p");
        desc.className = "news-desc";
        desc.textContent = a.description;
        content.appendChild(desc);
      }

      var meta = document.createElement("p");
      meta.className = "news-meta";
      var time = document.createElement("time");
      if (a._date) {
        time.dateTime = a._date.toISOString();
        time.textContent =
          a._date.getDate() + "-" + (a._date.getMonth() + 1) + "-" + a._date.getFullYear();
      } else {
        time.textContent = "Datum onbekend";
      }
      meta.appendChild(time);
      if (Array.isArray(a.creator) && a.creator.filter(Boolean).length) {
        meta.appendChild(document.createTextNode(" · " + a.creator.filter(Boolean).join(", ")));
      }
      content.appendChild(meta);

      // "Nieuw"-badge (laatste 25 uur)
      if (a._date && a._date.getTime() > Date.now() - 25 * 60 * 60 * 1000) {
        var badge = document.createElement("span");
        badge.className = "new-badge";
        badge.textContent = "Nieuw";
        h3.appendChild(badge);
      }

      li.appendChild(content);
      return li;
    }

    /* ---- filters opbouwen ---- */
    function buildSourceButtons() {
      var sources = {};
      articles.forEach(function (a) {
        if (a.source_id && a.source_id !== "Onbekende bron") sources[a.source_id] = true;
      });
      Object.keys(sources).sort().forEach(function (s) {
        var btn = document.createElement("button");
        btn.className = "filter-btn";
        btn.setAttribute("data-source", s);
        btn.textContent = s;
        filterContainer.appendChild(btn);
      });
    }

    function buildYearOptions() {
      var years = {};
      articles.forEach(function (a) { if (a._year) years[a._year] = true; });
      Object.keys(years).sort().reverse().forEach(function (y) {
        var opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
      });
    }

    function buildHeroStats() {
      if (!heroStats) return;
      var sourceCount = document.querySelectorAll(".filter-btn").length - 1;
      [
        [String(articles.length), " artikelen"],
        [String(sourceCount), " bronnen"],
      ].forEach(function (pair) {
        var span = document.createElement("span");
        var strong = document.createElement("strong");
        strong.textContent = pair[0];
        span.appendChild(strong);
        span.appendChild(document.createTextNode(pair[1]));
        heroStats.appendChild(span);
      });
    }

    /* ---- filteren + paginering ---- */
    function matches(a) {
      if (state.source !== "all" && a.source_id !== state.source) return false;
      if (state.year !== "all" && a._year !== state.year) return false;
      if (state.term && a._text.indexOf(state.term) === -1) return false;
      return true;
    }

    function apply() {
      var shown = 0;
      var total = 0;
      articles.forEach(function (a) {
        if (matches(a)) {
          total++;
          a._node.style.display = shown < state.limit ? "" : "none";
          if (shown < state.limit) shown++;
        } else {
          a._node.style.display = "none";
        }
      });
      counter.textContent =
        total === articles.length && shown === total
          ? "Totaal " + total + " artikelen."
          : shown + " van " + total + " artikelen getoond.";
      loadMoreBtn.hidden = shown >= total;
      emptyMsg.hidden = total !== 0;
      if (total === 0) {
        emptyMsg.textContent = "Geen artikelen gevonden voor deze combinatie van filters.";
      }
    }

    function bindEvents() {
      filterContainer.addEventListener("click", function (e) {
        var btn = e.target.closest(".filter-btn");
        if (!btn) return;
        document.querySelectorAll(".filter-btn").forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        state.source = btn.getAttribute("data-source") || "all";
        state.limit = PAGE_SIZE;
        apply();
      });

      var debounce;
      searchInput.addEventListener("input", function () {
        clearTimeout(debounce);
        var val = this.value;
        debounce = setTimeout(function () {
          state.term = val.toLowerCase().trim();
          state.limit = PAGE_SIZE;
          apply();
        }, 150);
      });

      yearSelect.addEventListener("change", function () {
        state.year = this.value;
        state.limit = PAGE_SIZE;
        apply();
      });

      loadMoreBtn.addEventListener("click", function () {
        state.limit += PAGE_SIZE;
        apply();
      });
    }
  });
})();
