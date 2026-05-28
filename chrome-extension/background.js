let lastSentUrl = '';
let lastSentTitle = '';
let failedAttempts = 0;
const MAX_FAILED_ATTEMPTS = 5;

// Send browser event to Electron agent local server
async function sendBrowserEvent(url, title) {
  // Skip system and extension URLs
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    return;
  }

  // De-duplicate: only send if URL or title changed
  // Be more aggressive about dedup to reduce noise
  const urlChanged = url !== lastSentUrl;
  const titleChanged = title !== lastSentTitle;
  
  if (!urlChanged && !titleChanged) {
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
      body: JSON.stringify({ 
        url: url || '', 
        title: title || 'No Title',
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      console.warn('[Knockturn Monitor] Server returned status:', response.status);
    } else {
      failedAttempts = 0; // Reset on success
      console.log('[Knockturn Monitor] ✓ Browser event sent:', { 
        url: url.substring(0, 60), 
        title: (title || '').substring(0, 50),
        timestamp: new Date().toLocaleTimeString()
      });
    }
  } catch (error) {
    failedAttempts++;
    if (failedAttempts <= MAX_FAILED_ATTEMPTS) {
      console.debug('[Knockturn Monitor] Failed to connect to local server (attempt ' + failedAttempts + '):', error.message);
    }
    // Silently fail after multiple attempts - agent might be offline
  }
}

// Listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.active) {
      console.log('[Knockturn Monitor] Tab activated:', { 
        tabId: activeInfo.tabId,
        url: tab.url?.substring(0, 60), 
        title: (tab.title || '').substring(0, 50)
      });
      sendBrowserEvent(tab.url, tab.title);
    }
  } catch (err) {
    console.error('[Knockturn Monitor] Error on tab activation:', err);
  }
});

// Listen for tab updates (navigating to a new page, loading complete)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && (changeInfo.status === 'complete' || changeInfo.url || changeInfo.title)) {
    console.log('[Knockturn Monitor] Tab updated:', { 
      tabId,
      status: changeInfo.status, 
      urlChanged: !!changeInfo.url,
      titleChanged: !!changeInfo.title,
      url: tab.url?.substring(0, 60), 
      title: (tab.title || '').substring(0, 50)
    });
    sendBrowserEvent(tab.url, tab.title);
  }
});

// Periodically sync the current active tab as fallback (every 30 seconds instead of 10)
setInterval(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && !tab.url.startsWith('chrome')) {
      console.debug('[Knockturn Monitor] Periodic tab sync check');
      sendBrowserEvent(tab.url, tab.title);
    }
  } catch (err) {
    // ignore
  }
}, 30000);

// Handle when a tab comes to focus (window focus)
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId: windowId });
    if (tab) {
      console.log('[Knockturn Monitor] Window focused, sending tab info');
      sendBrowserEvent(tab.url, tab.title);
    }
  } catch (err) {
    console.error('[Knockturn Monitor] Error on window focus:', err);
  }
});
