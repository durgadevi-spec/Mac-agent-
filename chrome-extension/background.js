let lastSentUrl = '';
let lastSentTitle = '';

// Send browser event to Electron agent local server
async function sendBrowserEvent(url, title) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    return;
  }

  // De-duplicate updates if they are identical
  if (url === lastSentUrl && title === lastSentTitle) {
    return;
  }

  lastSentUrl = url;
  lastSentTitle = title;

  try {
    const response = await fetch('http://localhost:5014/browser-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, title })
    });
    if (!response.ok) {
      console.warn('Knockturn agent returned non-ok status:', response.status);
    }
  } catch (error) {
    // Agent might be offline/closed
    console.debug('Failed to connect to Knockturn agent:', error.message);
  }
}

// Listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.active) {
      sendBrowserEvent(tab.url, tab.title);
    }
  } catch (err) {
    console.error(err);
  }
});

// Listen for tab updates (navigating to a new page, loading complete)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && (changeInfo.status === 'complete' || changeInfo.url || changeInfo.title)) {
    sendBrowserEvent(tab.url, tab.title);
  }
});

// Periodically sync the current active tab as fallback
setInterval(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      sendBrowserEvent(tab.url, tab.title);
    }
  } catch (err) {
    // ignore
  }
}, 10000);
