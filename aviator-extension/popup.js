// popup.js

function updatePopupUI() {
  chrome.storage.local.get(['aviatorOdds', 'lastScrapedTime', 'sourceUrl'], (result) => {
    const odds = result.aviatorOdds || [];
    const time = result.lastScrapedTime;
    const url = result.sourceUrl;

    const statusEl = document.getElementById('scraping-status');
    const syncEl = document.getElementById('last-sync-time');
    const urlEl = document.getElementById('source-url');
    const countEl = document.getElementById('odds-count');
    const container = document.getElementById('odds-container');

    if (odds.length > 0) {
      statusEl.textContent = 'Active & Connected';
      statusEl.className = 'status-val active';
      countEl.textContent = odds.length;
      
      if (time) {
        const date = new Date(time);
        syncEl.textContent = date.toLocaleTimeString();
      }

      if (url) {
        urlEl.textContent = url;
      }

      // Render latest 20 odds in grid
      container.innerHTML = '';
      const displayOdds = odds.slice(-20).reverse(); // newest first
      displayOdds.forEach(val => {
        const el = document.createElement('div');
        el.className = 'odd-badge';
        if (val >= 2.0) {
          el.className += ' high';
        } else if (val < 1.2) {
          el.className += ' low';
        }
        el.textContent = val.toFixed(2) + 'x';
        container.appendChild(el);
      });
    } else {
      statusEl.textContent = 'Inactive';
      statusEl.className = 'status-val inactive';
      syncEl.textContent = '—';
      urlEl.textContent = 'Open an Aviator game tab';
      countEl.textContent = '0';
      container.innerHTML = `
        <div style="grid-column: span 5; text-align: center; font-size: 0.8rem; color: var(--text-secondary); padding: 12px 0;">
          No data collected yet.
        </div>
      `;
    }
  });
}

// Open dashboard tab
document.getElementById('btn-open-dash').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:5174/' });
});

// Update UI initially and when storage changes
document.addEventListener('DOMContentLoaded', updatePopupUI);
chrome.storage.onChanged.addListener(updatePopupUI);
