// assets/js/newsdashboard.js
document.addEventListener('DOMContentLoaded', function() {

    const newsList = document.getElementById('news-list');
    const counter = document.getElementById('article-counter');
    const filterContainer = document.getElementById('filter-container');

    async function fetchNews() {
        try {
            const response = await fetch('data/news.json'); 
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            // --- GECORRIGEERD ---
            // Lees de platte array direct in, in plaats van een geneste array te verwachten.
            const articles = await response.json();
            
            if (articles && articles.length > 0) {
                renderArticles(articles);
                renderFilterButtons(articles);
                setupEventListeners();
            } else {
                displayNoArticlesMessage();
            }
        } catch (error) {
            console.error("Fout bij het ophalen van nieuws:", error);
            displayNoArticlesMessage();
        }
    }

    function renderArticles(articles) {
        newsList.innerHTML = '';
        articles.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = 'news-item';
            listItem.dataset.pubdate = item.pubDate;
            listItem.dataset.source = item.source_id;

            let imageHtml = '';
            if (item.image_url && item.image_url !== "") {
                imageHtml = `<img src="${item.image_url}" alt="Beeld bij artikel: ${item.title}" class="news-image">`;
            }

            const contentHtml = `
                <div class="news-content">
                    <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></h3>
                    <p>
                        <strong>Bron:</strong> ${item.source_id} 
                        ${item.creator && item.creator.length > 0 && item.creator[0] ? `| <strong>Auteur:</strong> ${item.creator.join(", ")}` : ''}
                        <br>
                        <strong>Publicatiedatum:</strong> ${formatDate(item.pubDate)}
                    </p>
                    <p>${item.description}</p>
                </div>
            `;
            
            listItem.innerHTML = imageHtml + contentHtml;
            newsList.appendChild(listItem);
        });
    }

    function renderFilterButtons(articles) {
        const sources = [...new Set(articles.map(item => item.source_id))];
        sources.sort().forEach(source => {
            if (source) {
                const button = document.createElement('button');
                button.className = 'filter-btn';
                button.dataset.source = source;
                button.textContent = source;
                filterContainer.appendChild(button);
            }
        });
    }
    
    function setupEventListeners() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                const sourceFilter = this.dataset.source;
                const newsItems = document.querySelectorAll('.news-item');
                
                newsItems.forEach(item => {
                    if (sourceFilter === 'all' || item.dataset.source === sourceFilter) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
                updateCounter();
            });
        });
        
        updateCounter();
        addNewBadges();
    }

    function displayNoArticlesMessage() {
        newsList.innerHTML = '<p>Er worden momenteel geen nieuwsberichten gevonden. De data wordt elke dag bijgewerkt.</p>';
        counter.textContent = '0 artikelen gevonden.';
    }

    function updateCounter() {
        const newsItems = document.querySelectorAll('.news-item');
        const visibleItems = document.querySelectorAll('.news-item:not([style*="display: none"])').length;
        counter.textContent = `Totaal ${visibleItems} van de ${newsItems.length} artikelen getoond.`;
    }

    function addNewBadges() {
        const newsItems = document.querySelectorAll('.news-item');
        const twentyFiveHoursAgo = new Date();
        twentyFiveHoursAgo.setHours(twentyFiveHoursAgo.getHours() - 25);
        
        newsItems.forEach(item => {
            const pubDateString = item.dataset.pubdate;
            if (pubDateString) {
                try {
                    const pubDate = new Date(pubDateString.replace(" ", "T"));
                    if (!isNaN(pubDate) && pubDate > twentyFiveHoursAgo) {
                        if (item.querySelector('.new-badge')) return;
                        
                        const newBadge = document.createElement('span');
                        newBadge.textContent = '✨ Nieuw';
                        newBadge.className = 'new-badge';
                        newBadge.style.cssText = 'background-color: #28a745; color: white; padding: 3px 8px; margin-left: 10px; border-radius: 5px; font-size: 0.8em; font-weight: bold;';
                        item.querySelector('h3').appendChild(newBadge);
                    }
                } catch(e) { /* Negeer ongeldige datums */ }
            }
        });
    }
    
    function formatDate(dateString) {
        if (!dateString) return 'Geen datum';
        try {
            const date = new Date(dateString.replace(" ", "T"));
            if (isNaN(date)) return 'Ongeldige datum';
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}-${month}-${year} ${hours}:${minutes}`;
        } catch(e) {
            return 'Ongeldige datum';
        }
    }

    fetchNews();
});
