document.addEventListener('DOMContentLoaded', function() {
  const summarizeBtn = document.getElementById('summarizeBtn');
  const explainBtn = document.getElementById('explainBtn');
  const adjustDifficultyBtn = document.getElementById('adjustDifficultyBtn');
  const difficultySlider = document.getElementById('difficultySlider');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const providerSelect = document.getElementById('providerSelect');
  const status = document.getElementById('status');

  // Load saved settings
  chrome.storage.sync.get(['apiKey', 'provider'], function(result) {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    if (result.provider) {
      providerSelect.value = result.provider;
    }
  });

  // Show status message
  function showStatus(message, isError = false) {
    status.textContent = message;
    status.className = `status ${isError ? 'error' : 'success'}`;
    status.style.display = 'block';
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }

  // Save API key
  saveKeyBtn.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    const provider = providerSelect.value;
    
    if (!apiKey) {
      showStatus('Please enter an API key', true);
      return;
    }

    chrome.storage.sync.set({ apiKey, provider }, function() {
      showStatus('API key saved successfully');
    });
  });

  // Persist provider selection changes
  providerSelect.addEventListener('change', function() {
    const provider = providerSelect.value;
    chrome.storage.sync.set({ provider }, function() {
      showStatus(`Provider set to ${provider}`);
    });
  });

  async function ensureContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content.css']
      });
    } catch (error) {
      throw new Error(error?.message || 'Failed to inject content script');
    }
  }

  function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });
  }

  async function sendAction(action, payload = {}) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs && tabs[0];

      if (!tab || !tab.id) {
        showStatus('No active tab found', true);
        return;
      }

      try {
        await sendMessageToTab(tab.id, { action, ...payload });
      } catch (error) {
        // Try injecting content script if it's not available in the page
        await ensureContentScript(tab.id);
        await sendMessageToTab(tab.id, { action, ...payload });
      }
    } catch (error) {
      showStatus(error?.message || 'Failed to send action', true);
      return;
    }
  }

  // Summarize article
  summarizeBtn.addEventListener('click', function() {
    sendAction('summarize');
  });

  // Explain selected text
  explainBtn.addEventListener('click', function() {
    sendAction('explain');
  });

  // Adjust reading difficulty
  adjustDifficultyBtn.addEventListener('click', function() {
    const difficulty = difficultySlider.value;
    sendAction('adjustDifficulty', { difficulty });
  });
});