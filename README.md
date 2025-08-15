# 📰 Persoonlijk Nieuws Dashboard

Welkom bij het Persoonlijk Nieuws Dashboard! Dit project is ontworpen om automatisch het internet af te zoeken naar nieuwsartikelen waarin een specifieke naam (in dit geval "Mark Eijbaard") voorkomt. Het verzamelt deze artikelen, voegt ze toe aan een groeiend archief en presenteert ze op een schone, filterbare webpagina die wordt gehost via GitHub Pages.

De perfecte tool om op de hoogte te blijven van je online aanwezigheid!

---

## ✨ Kenmerken

* **Automatische Dagelijkse Updates**: Elke ochtend om 07:00 UTC haalt een script automatisch de nieuwste artikelen op.
* **Groeiend Archief**: Nieuwe artikelen worden toegevoegd aan het bestaande archief, waarbij dubbele items worden verwijderd.
* **Visueel Aantrekkelijk**: Artikelen worden getoond met afbeelding, titel, bron, auteur en beschrijving.
* **Filterbaar**: Filter de nieuwsberichten eenvoudig per nieuwsbron met handige knoppen.
* **Nieuwe Berichten Gemarkeerd**: Artikelen van de laatste 24 uur krijgen een "✨ Nieuw" label.
* **Volledig Gratis Hosting**: Draait volledig op de gratis diensten van GitHub (Actions & Pages).

---

## 🚀 Installatie & Configuratie Gids

Volg deze stappen om je eigen nieuwsdashboard op te zetten in een nieuwe GitHub repository.

### **Stap 1: Repository Opzetten**

1.  Maak een nieuwe **publieke** repository aan op GitHub. De naam moet eindigen op `.github.io` als je het als je hoofdwebsite wilt gebruiken (bijv. `jouwgebruikersnaam.github.io`), of geef het een andere naam (bijv. `nieuws-dashboard`) voor een projectwebsite.
2.  Kloon de repository naar je computer (of gebruik GitHub Desktop).

### **Stap 2: Bestanden Toevoegen** 📂

Zorg ervoor dat de volgende bestanden met de juiste inhoud en op de juiste locatie in je repository staan.

* **In de hoofdmap (`/`)**:
    * `newsdashboard.md`: De hoofdpagina die de nieuwsberichten toont.
    * `Gemfile`: Definieert de software die nodig is om de site te bouwen.
* **In de `_data` map (`/_data/`)**:
    * `news.json`: Het databestand met je nieuwsarchief. Begin met een leeg bestand `[]` of een voorbeeldbestand om de structuur te zien.
* **In de `.github/workflows` map (`/.github/workflows/`)**:
    * `fetch_news.yml`: De workflow die dagelijks nieuws ophaalt.
    * `build-jekyll.yml`: De workflow die de website bouwt en publiceert.

### **Stap 3: API Sleutel Instellen** 🔑

De workflow heeft een API-sleutel van [newsdata.io](https://newsdata.io/) nodig. Deze slaan we veilig op.

1.  Ga naar je GitHub repository en klik op **Settings**.
2.  Navigeer naar **Secrets and variables** > **Actions**.
3.  Klik op de knop **New repository secret**.
4.  **Naam:** `NEWSDATA_API_KEY`
5.  **Value:** Plak hier je API-sleutel van newsdata.io.
6.  Klik op **Add secret**.

### **Stap 4: GitHub Pages Activeren** 🌐

We vertellen GitHub dat het de site moet publiceren via onze build-workflow.

1.  Ga opnieuw naar **Settings** in je repository.
2.  Kies in het linkermenu voor **Pages**.
3.  Onder "Build and deployment", bij "Source", selecteer **GitHub Actions**.

### **Stap 5: Testen & Live Gaan** ✅

1.  Commit en push alle bestanden naar je GitHub repository.
2.  Ga naar het **Actions** tabblad. Je zult zien dat de `Build and Deploy` workflow start.
3.  Start de `Fetch Daily News` workflow handmatig door erop te klikken en de "Run workflow" knop te gebruiken.
4.  Wacht tot beide workflows succesvol zijn afgerond (groene vinkjes).
5.  Je site is nu live! De URL vind je terug onder **Settings** > **Pages**.

---

## 🗂️ Handleiding: Initieel Archief Aanmaken

Om te starten met een gevuld dashboard, is een initieel archief van oudere artikelen verzameld. Hieronder de methode die daarvoor is gebruikt.

### **Doel van de Dataverzameling**

Het doel was om gestructureerde data te verzamelen van verschillende online nieuwsbronnen. Deze data, opgeslagen in CSV-formaat, is samengevoegd tot het `news.json`-bestand dat als startpunt voor het dashboard dient.

### **Gebruikte Databronnen** 🖥️

De data is verzameld van de volgende websites:

* AD.nl
* RTV Utrecht
* Gooi- en Eemlander
* Baarnsche Courant

### **Methode**

De dataverzameling is uitgevoerd via een semi-automatische aanpak, nadat een volledig geautomatiseerde script-gebaseerde methode te complex en onbetrouwbaar bleek.

#### **1. Oorspronkelijke Aanpak (Python Script)** 🐍

In eerste instantie is geprobeerd om een script in Python te ontwikkelen met `requests`, `BeautifulSoup` en `Selenium`. Deze aanpak stuitte op significante obstakels:

* **Dynamische Content**: Veel websites laden hun zoekresultaten met JavaScript, waardoor simpele scrapers niet effectief waren.
* **Anti-Scraping Maatregelen**: De websites detecteerden en blokkeerden geautomatiseerde browsers (zoals `Selenium`), zelfs met tools als `undetected-chromedriver`.
* **Technische Complexiteit**: Het proces vereiste het oplossen van besturingssysteem-specifieke permissies (macOS) en compatibiliteitsproblemen met Python-versies.

#### **2. Definitieve Aanpak (Web Scraper Extensie)** 🖱️

Vanwege de bovenstaande uitdagingen is gekozen voor een robuustere methode: de **[Web Scraper](https://chromewebstore.google.com/detail/web-scraper-free-web-scra/jnhgnonknehpejjnehehllkliplmbmhn?hl=nl)** browserextensie voor Chrome.

Deze no-code tool omzeilt anti-scraping maatregelen doordat de gebruiker zelf de pagina laadt in een normale browsersessie.

De workflow was als volgt:

1.  **Installatie**: De Web Scraper extensie is toegevoegd aan Google Chrome.
2.  **Navigatie**: Handmatig navigeren naar de zoekresultatenpagina van elke nieuwsbron.
3.  **Sitemap Creatie**: Voor elke website is een 'sitemap' (een schraap-plan) aangemaakt.
4.  **Selectors Definiëren**: Met de point-and-click interface van de tool zijn de data-elementen (titel, link, beschrijving, etc.) geselecteerd.
5.  **Data Scrapen**: Het schraap-plan is uitgevoerd.
6.  **Exporteren**: De verzamelde data is geëxporteerd naar een `.csv`-bestand.

### **Volgende Stappen**

De verzamelde `.csv`-bestanden zijn opgeschoond (o.a. ontdubbeld) en samengevoegd tot het `_data/news.json` bestand in deze repository. Dit vormt de basis van het archief.
