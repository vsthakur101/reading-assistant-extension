chrome.runtime.onInstalled.addListener(() => {
  console.log('Reading Assistant extension installed');
});

// Handle API calls from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'makeAPICall') {
    // This could be used for more complex API handling
    // For now, content scripts make direct API calls
    sendResponse({ success: false, error: 'Not implemented' });
  }
});