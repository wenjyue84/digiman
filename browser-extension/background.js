// background.js - Service worker for extension

// Monitor when user navigates to localhost ports
chrome.webNavigation.onErrorOccurred.addListener(
  (details) => {
    // ERR_CONNECTION_REFUSED detected
    if (details.error === 'net::ERR_CONNECTION_REFUSED') {
      console.log('[PelangiLauncher] Connection refused detected:', details.url);
      // Content script will handle UI injection
    }
  },
  {
    url: [
      { urlMatches: 'http://localhost:3000/.*' },
      { urlMatches: 'http://localhost:3002/.*' },
      { urlMatches: 'http://localhost:5000/.*' }
    ]
  }
);

console.log('[PelangiLauncher] Background service worker loaded');
