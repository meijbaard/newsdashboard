// assets/js/newsdashboard.js

document.addEventListener('DOMContentLoaded', function() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const newsItems = document.querySelectorAll('#news-list .news-item');
  const counter = document.getElementById('article-counter');

  // Functie om de teller bij te werken
  function updateCounter() {
    const visibleItems = document.querySelectorAll('#news-list .news-item:not([style*="display: none"])').length;
    counter.textContent = `Totaal ${visibleItems} van de ${newsItems.length} artikelen getoond.`;
  }
  
  // Filter logica
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Activeer de juiste knop
      filterButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      const sourceFilter = this.dataset.source;
      
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

  // Functie om "Nieuw" labels toe te voegen
  function addNewBadges() {
    const twentyFiveHoursAgo = new Date();
    twentyFiveHoursAgo.setHours(twentyFiveHoursAgo.getHours() - 25);
    
    newsItems.forEach(item => {
      const pubDateString = item.dataset.pubdate;
      if (pubDateString) {
        const pubDate = new Date(pubDateString.replace(" ", "T") + "Z");
        if (pubDate > twentyFiveHoursAgo) {
          // Voorkom dubbele badges
          if (item.querySelector('.new-badge')) return;
          
          const newBadge = document.createElement('span');
          newBadge.textContent = '✨ Nieuw';
          newBadge.className = 'new-badge'; // Klasse voor makkelijker vinden
          newBadge.style.backgroundColor = '#28a745';
          newBadge.style.color = 'white';
          newBadge.style.padding = '3px 8px';
          newBadge.style.marginLeft = '10px';
          newBadge.style.borderRadius = '5px';
          newBadge.style.fontSize = '0.8em';
          newBadge.style.fontWeight = 'bold';
          item.querySelector('h3').appendChild(newBadge);
        }
      }
    });
  }

  // Initialiseer alles
  updateCounter();
  addNewBadges();
});
