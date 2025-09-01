# 📰 Persoonlijk Nieuws Dashboard

Welkom bij het Persoonlijk Nieuws Dashboard! Dit project is ontworpen om automatisch nieuwsartikelen te verzamelen waarin een specifieke naam voorkomt. De artikelen worden toegevoegd aan een groeiend archief en gepresenteerd op een schone, filterbare webpagina die wordt gehost via GitHub Pages.

De perfecte tool om op de hoogte te blijven van je online aanwezigheid!

[Link naar de live demo-pagina](https://markeijbaard.nl/inhetnieuws/)

---

## ✨ Kenmerken

* **Automatische Updates**: Een script haalt elke vier uur automatisch de nieuwste artikelen op.
* **Groeiend Archief**: Nieuwe artikelen worden op basis van de titel ontdubbeld en toegevoegd aan het bestaande archief.
* **Dynamische Interface**: De webpagina laadt de nieuwsberichten dynamisch in met JavaScript.
* **Filterbaar**: Filter de nieuwsberichten eenvoudig per nieuwsbron met interactieve knoppen.
* **Visueel Aantrekkelijk**: Artikelen worden getoond met afbeelding, titel, bron, auteur en beschrijving.
* **"Nieuw" Label**: Artikelen van de laatste 25 uur krijgen een speciaal "✨ Nieuw" label.
* **Volledig Gratis Hosting**: Draait volledig op de gratis diensten van GitHub (Actions & Pages).

---

## 🚀 Installatie & Configuratie Gids

Volg deze stappen om je eigen nieuwsdashboard op te zetten in een nieuwe GitHub repository.

### **Stap 1: Repository Opzetten**

1.  Maak een nieuwe **publieke** repository aan op GitHub (bijv. `nieuws-dashboard`).
2.  Kloon de repository naar je computer.
3.  Zorg ervoor dat alle bestanden uit deze repository (`index.html`, `assets/`, `data/`, `.github/`) in je nieuwe repository staan.

### **Stap 2: De Nieuwsbron Instellen (Google Nieuws & RSS.app)**

Omdat Google Nieuws geen directe RSS-links meer aanbiedt, gebruiken we de gratis dienst [RSS.app](https://rss.app/) om een stabiele JSON-feed te genereren.

1.  **Formuleer je zoekopdracht**: Ga naar [Google Nieuws](https://news.google.com) en gebruik de geavanceerde zoekfunctie (tandwiel-icoon) om een precieze zoekopdracht te maken. Een goed voorbeeld is:
    * **"Met alle woorden"**: `NAAM (site:ad.nl OR site:rtvutrecht.nl OR site:gooieneemlander.nl)`
    * **"Met een van deze woorden"**: `WOORD ANDERWOORD`

2.  **Kopieer de URL**: Voer de zoekopdracht uit en kopieer de volledige URL uit de adresbalk van je browser.

3.  **Genereer de Feed**:
    * Ga naar [RSS.app](https://rss.app/) en maak een gratis account.
    * Plak je Google Nieuws-URL in het daarvoor bestemde veld en klik op "Generate".
    * RSS.app genereert nu een feed. Klik op de feed en zoek de optie om de **JSON-feed URL** te krijgen. Deze ziet er ongeveer zo uit: `https://rss.app/feeds/v1.1/jouw_unieke_code.json`.

### **Stap 3: Sla de Feed-URL Veilig Op**

1.  Ga in je GitHub repository naar **Settings > Secrets and variables > Actions**.
2.  Klik op de knop **New repository secret**.
3.  **Naam:** `RSS_FEED_URL`
4.  **Value:** Plak hier de **JSON-feed-URL** die je van RSS.app hebt gekregen.
5.  Klik op **Add secret**.

### **Stap 4: GitHub Pages Activeren**

1.  Ga in je repository naar **Settings > Pages**.
2.  Onder "Build and deployment", selecteer bij "Source" de optie **GitHub Actions**. GitHub zal automatisch de `pages.yml` workflow gebruiken om de site te publiceren.

### **Stap 5: Live Gaan**

1.  Commit en push alle bestanden naar je `main` branch.
2.  Ga naar het **Actions** tabblad in je repository. Je zult zien dat de `Deploy NewsDashboard` workflow start om je site te publiceren.
3.  Je kunt de `Fetch Daily News` workflow handmatig starten om direct de eerste artikelen op te halen.
4.  Je site is nu live! De URL vind je terug onder **Settings > Pages**.
