// background.js

// Allow user to open side panel by clicking the toolbar action icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Log installation / startup status
chrome.runtime.onInstalled.addListener(() => {
  console.log("Aviator Scraper & Sync Extension installed successfully!");
});
