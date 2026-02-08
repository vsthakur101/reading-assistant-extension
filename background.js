chrome.runtime.onInstalled.addListener(() => {
  console.log('Reading Assistant extension installed');
});

// Handle API calls from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'makeAPICall') {
    (async () => {
      try {
        const { provider, apiKey, prompt } = request;
        if (!apiKey) {
          sendResponse({ success: false, error: 'Missing API key' });
          return;
        }

        const endpoint = provider === 'claude'
          ? 'https://api.anthropic.com/v1/messages'
          : 'https://api.openai.com/v1/chat/completions';

        const headers = {
          'Content-Type': 'application/json'
        };

        const body = provider === 'claude'
          ? {
              model: 'claude-3-haiku-20240307',
              max_tokens: 1000,
              messages: [{ role: 'user', content: prompt }]
            }
          : {
              model: 'gpt-3.5-turbo',
              max_tokens: 1000,
              messages: [{ role: 'user', content: prompt }]
            };

        if (provider === 'claude') {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        } else {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errorText = await response.text();
          sendResponse({ success: false, error: `API request failed: ${response.status} ${errorText}` });
          return;
        }

        const data = await response.json();
        const result = provider === 'claude'
          ? data?.content?.[0]?.text
          : data?.choices?.[0]?.message?.content;

        if (!result) {
          sendResponse({ success: false, error: 'No response content returned from API' });
          return;
        }

        sendResponse({ success: true, result });
      } catch (error) {
        sendResponse({ success: false, error: error?.message || 'Unknown error' });
      }
    })();

    return true;
  }
});