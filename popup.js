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

  // Summarize article
  summarizeBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'summarize'
      });
    });
    window.close();
  });

  // Explain selected text
  explainBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'explain'
      });
    });
    window.close();
  });

  // Adjust reading difficulty
  adjustDifficultyBtn.addEventListener('click', function() {
    const difficulty = difficultySlider.value;
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'adjustDifficulty',
        difficulty: difficulty
      });
    });
    window.close();
  });
});