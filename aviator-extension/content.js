// content.js
// Chrome Extension Content Script for Aviator Scraper & Sync

let lastScrapedData = [];

// Helper to parse strings like "1.97x", "12.50x", "6,256.74x"
function parseMultiplierString(text) {
  if (!text) return null;
  const cleanedText = text.trim().replace(/,/g, '');
  const match = cleanedText.match(/^(\d+(?:\.\d+)?)\s*x$/i);
  if (match) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val >= 1.0 && val <= 10000000) {
      return val;
    }
  }
  return null;
}

// Scrape multipliers from the top payouts history bar only
function scrapeMultipliers() {
  const oddsFound = [];

  function searchInDocument(doc) {
    if (!doc) return;

    // 1. Target container elements strictly related to round history.
    // We match any known class or tag name for the top history bar.
    let containers = Array.from(doc.querySelectorAll('app-payouts-block, .payouts-block, .payouts-wrapper, .payouts, .stats-list, .history-bar, .payouts-block-wrapper'));
    
    if (containers.length > 0) {
      // Filter out containers that are nested inside another matched container to avoid duplication
      containers = containers.filter(c1 => {
        return !containers.some(c2 => c2 !== c1 && c2.contains(c1));
      });

      const processedElements = new Set();
      containers.forEach(container => {
        // Query ALL descendants inside the history container
        const items = container.querySelectorAll('*');
        
        items.forEach(el => {
          if (processedElements.has(el)) return;
          
          // Check if this element is already inside another matched element to prevent duplication
          let isNested = false;
          let parent = el.parentElement;
          while (parent && parent !== container) {
            if (processedElements.has(parent)) {
              isNested = true;
              break;
            }
            parent = parent.parentElement;
          }
          
          if (!isNested) {
            processedElements.add(el);
            const val = parseMultiplierString(el.textContent);
            if (val !== null) {
              oddsFound.push(val);
            }
          }
        });
      });
    }

    // 2. Fallback search (only if strict containers weren't found)
    // Scan all small badge elements but ignore any player betting panels
    if (oddsFound.length === 0) {
      try {
        const bubbles = doc.querySelectorAll('.bubble, .bubble-multiplier, .history-item, app-payout-item, button, span, div');
        const processed = new Set();
        bubbles.forEach(b => {
          // Check if this bubble is inside the user bet columns/sidebars
          let isNested = false;
          let isPlayerList = false;
          let parent = b.parentElement;
          
          while (parent) {
            if (parent.className && typeof parent.className === 'string') {
              const cls = parent.className.toLowerCase();
              if (cls.includes('bets-list') || cls.includes('all-bets') || cls.includes('users-list') || cls.includes('bets-block') || cls.includes('navigation-history') || cls.includes('left-panel') || cls.includes('sidebar')) {
                isPlayerList = true;
                break;
              }
            }
            if (processed.has(parent)) {
              isNested = true;
              break;
            }
            parent = parent.parentElement;
          }
          
          if (!isNested && !isPlayerList) {
            processed.add(b);
            const val = parseMultiplierString(b.textContent);
            if (val !== null) oddsFound.push(val);
          }
        });
      } catch (e) {}
    }

    // 3. Search accessible iframes recursively
    try {
      const iframes = doc.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          if (iframe.contentDocument) {
            searchInDocument(iframe.contentDocument);
          }
        } catch (iframeErr) {
          // Cross-origin iframe
        }
      });
    } catch (e) {}
  }

  searchInDocument(document);

  // Clean consecutive duplicates
  const cleanOdds = [];
  for (let i = 0; i < oddsFound.length; i++) {
    if (i === 0 || oddsFound[i] !== oddsFound[i - 1]) {
      cleanOdds.push(oddsFound[i]);
    }
  }

  return cleanOdds;
}

// Main logic to perform scraper and save to storage
function performScraping() {
  if (window.location.href.includes('localhost:') || window.location.href.includes('127.0.0.1')) {
    return;
  }

  const scraped = scrapeMultipliers();
  if (scraped.length > 0) {
    const joinedScraped = scraped.join(',');
    const joinedLast = lastScrapedData.join(',');
    if (joinedScraped !== joinedLast) {
      lastScrapedData = scraped;
      chrome.storage.local.set({ 
        aviatorOdds: scraped,
        lastScrapedTime: Date.now(),
        sourceUrl: window.location.href
      });
    }
  }
}

// Run scraper regularly
if (!window.location.href.includes('localhost:') && !window.location.href.includes('127.0.0.1')) {
  setInterval(performScraping, 1200);
  performScraping();
}

// ── Dashboard Bridge Logic ──────────────────────────────────────────────────
if (window.location.href.includes('localhost:') || window.location.href.includes('127.0.0.1')) {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data && event.data.type === 'REQUEST_EXTENSION_DATA') {
      chrome.storage.local.get(['accumulatedOdds', 'lastScrapedTime', 'sourceUrl'], (result) => {
        window.postMessage({
          type: 'EXTENSION_DATA',
          odds: result.accumulatedOdds || [],
          time: result.lastScrapedTime || null,
          url: result.sourceUrl || ''
        }, '*');
      });
    }
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.accumulatedOdds) {
      chrome.storage.local.get(['lastScrapedTime', 'sourceUrl'], (result) => {
        window.postMessage({
          type: 'EXTENSION_DATA_UPDATE',
          odds: changes.accumulatedOdds.newValue || [],
          time: result.lastScrapedTime || Date.now(),
          url: result.sourceUrl || ''
        }, '*');
      });
    }
  });
}
