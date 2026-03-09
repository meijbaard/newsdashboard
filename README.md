# Personal News Dashboard

Een geautomatiseerd, gratis en onafhankelijk nieuwsdashboard voor publieke figuren, politici en organisaties. Dit project haalt lokaal en landelijk nieuws over jou op, ontdubbelt het, verwijdert 'lelijke' data en presenteert het in een strak filterbaar overzicht. 

Er zijn geen betaalde diensten of servers nodig; alles draait lokaal via GitHub Actions en Jekyll.

## Hoe werkt het?
1. **Hybride Ophaalsysteem:** Het script (`update_news.js`) haalt periodiek nieuws op via directe RSS-feeds van lokale kranten (voor de hoogste kwaliteit). 
2. **Google Vangnet:** Als vangnet leest het script ook een Google Nieuws RSS-zoekopdracht uit (voor landelijke titels).
3. **Validatie:** Het script ontdubbelt artikelen, herstelt ongeldige karakters en slaat alles veilig op in `_data/news.json`.
4. **Jekyll:** De front-end gebruikt Liquid-tags om de data pijlsnel in te laden.

## Installatie in 5 minuten

### Stap 1: Repository Klokken
Fork of kloon deze repository naar je eigen GitHub account. Zorg dat in je repo (onder *Settings > Pages*) is geselecteerd dat de site gebouwd wordt via **GitHub Actions**.

### Stap 2: Lokale Bronnen Instellen
Open het bestand `.github/scripts/update_news.js` en pas bovenaan het instellingenblok aan:
* Wijzig `searchRegex` naar jouw naam (bijv. `/Jan Jansen/i`).
* Vul in de array `directFeeds` de directe RSS-links in van jouw belangrijkste lokale media.

### Stap 3: Google Nieuws URL Genereren (Het vangnet)
1. Ga naar [Google Nieuws](https://news.google.com).
2. Zoek naar jouw naam (bijv. `"Jan Jansen"` of specifieker: `"Jan Jansen" site:ad.nl`).
3. Kopieer de URL uit je adresbalk (bevat `/search?`).
4. Verander `/search?` in de URL naar `/rss/search?`.
5. Ga in je GitHub repo naar **Settings > Secrets and variables > Actions**.
6. Maak een nieuwe secret aan genaamd `RSS_FEED_URL` en plak daar je nieuwe RSS-link in.

### Stap 4: Personaliseer de HTML
Open `index.html` en vervang de tekst `[HIER JE NAAM]` door jouw eigen naam of de naam van je project.

### Stap 5: Activeer het Dashboard
Ga in je repository naar het tabblad **Actions**. Selecteer links "Fetch Daily News" en klik op **Run workflow**. Je archief begint zich nu automatisch te vullen met kogelvrije data en zal vanaf nu elke 4 uur worden bijgewerkt!
