---
title: "Mark Eijbaard in het nieuws"
permalink: /inhetnieuws/
author_profile: false
layout: default
---

<style>
  .content-wrapper {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  .news-controls {
    margin-bottom: 2em;
    padding-bottom: 1em;
    border-bottom: 1px solid #eee;
  }
  .filter-btn {
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 15px;
    padding: 8px 15px;
    margin-right: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .filter-btn:hover {
    background-color: #ddd;
  }
  .filter-btn.active {
    background-color: #007bff;
    color: white;
    border-color: #007bff;
  }
  .news-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 2em;
    list-style-type: none;
    padding-left: 0;
  }
  .news-image {
    width: 150px;
    height: 150px;
    object-fit: cover;
    margin-right: 20px;
    border-radius: 8px;
    flex-shrink: 0;
  }
  .news-content {
    flex: 1;
  }
  .news-content h3 {
    margin-top: 0;
  }
  ul#news-list {
    padding-left: 0;
  }
</style>

<div class="content-wrapper">

  <h1>Mark Eijbaard in het nieuws</h1>

  <div class="news-controls">
    <p id="article-counter">Artikelen aan het laden...</p>
    <div>
      <strong>Filter op bron:</strong><br>
      <button class="filter-btn active" data-source="all">Alles tonen</button>
      
      {% assign sources = "" | split: "," %}
      {% for item in site.data.news[0] %}
        {% unless sources contains item.source_id %}
          {% assign sources = sources | push: item.source_id %}
        {% endunless %}
      {% endfor %}
      
      {% for source in sources %}
        <button class="filter-btn" data-source="{{ source }}">{{ source }}</button>
      {% endfor %}
    </div>
  </div>

  <div id="nieuws-dashboard">
    {%- if site.data.news[0] and site.data.news[0].size > 0 -%}
      <ul id="news-list">
        {%- for item in site.data.news[0] -%}
          <li class="news-item" data-pubdate="{{ item.pubDate }}" data-source="{{ item.source_id }}">
            
            {% if item.image_url and item.image_url != "" %}
              <img src="{{ item.image_url }}" alt="Beeld bij artikel: {{ item.title }}" class="news-image">
            {% endif %}

            <div class="news-content">
              <h3><a href="{{ item.link }}" target="_blank" rel="noopener noreferrer">{{ item.title }}</a></h3>
              <p>
                <strong>Bron:</strong> {{ item.source_id }} 
                {% if item.creator and item.creator.size > 0 and item.creator[0] != "" %}
                  | <strong>Auteur:</strong> {{ item.creator | join: ", " }}
                {% endif %}
                <br>
                <strong>Publicatiedatum:</strong> {{ item.pubDate | date: "%d-%m-%Y %H:%M" }}
              </p>
              <p>{{ item.description }}</p>
            </div>
          </li>
        {%- endfor -%}
      </ul>
    {%- else -%}
      <p>Er worden momenteel geen nieuwsberichten gevonden. De data wordt elke ochtend bijgewerkt.</p>
    {%- endif -%}
  </div>

</div>

<script>
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
</script>
