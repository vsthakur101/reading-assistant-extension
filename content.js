class ReadingAssistant {
  constructor() {
    this.apiKey = null;
    this.provider = null;
    this.isProcessing = false;
    this.selectedText = '';
    
    this.init();
  }

  async init() {
    // Load API settings
    const result = await chrome.storage.sync.get(['apiKey', 'provider']);
    this.apiKey = result.apiKey;
    this.provider = result.provider || 'claude';

    // Create overlay elements
    this.createOverlayElements();

    // Setup event listeners
    this.setupEventListeners();
  }

  createOverlayElements() {
    // Main overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'reading-assistant-overlay';
    
    // Popup content
    this.popup = document.createElement('div');
    this.popup.className = 'reading-assistant-popup';
    
    // Tooltip for inline explanations
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'reading-assistant-tooltip';

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.popup);
    document.body.appendChild(this.tooltip);
  }

  setupEventListeners() {
    // Close overlay when clicking outside
    this.overlay.addEventListener('click', () => this.hideOverlay());
    
    // Text selection listener for explanations
    document.addEventListener('mouseup', (e) => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text.length > 0) {
        this.selectedText = text;
        // Show explanation option near selection
        this.showExplanationOption(e.pageX, e.pageY);
      }
    });

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request);
    });
  }

  handleMessage(request) {
    switch(request.action) {
      case 'summarize':
        this.summarizeArticle();
        break;
      case 'explain':
        this.explainSelectedText();
        break;
      case 'adjustDifficulty':
        this.adjustReadingDifficulty(request.difficulty);
        break;
    }
  }

  async summarizeArticle() {
    if (!this.apiKey) {
      this.showError('Please set your API key in the extension settings');
      return;
    }

    const articleText = this.extractArticleText();
    if (!articleText) {
      this.showError('Could not find article content to summarize');
      return;
    }

    this.showLoading('Summarizing article...');
    
    try {
      const summary = await this.callAPI(`Please summarize this article in 3-4 bullet points:\n\n${articleText}`);
      this.showResult('Article Summary', summary);
    } catch (error) {
      this.showError('Failed to summarize article: ' + error.message);
    }
  }

  async explainSelectedText() {
    if (!this.selectedText) {
      this.showError('Please select some text to explain');
      return;
    }

    if (!this.apiKey) {
      this.showError('Please set your API key in the extension settings');
      return;
    }

    this.showLoading('Explaining selected text...');
    
    try {
      const explanation = await this.callAPI(`Please explain this term or concept in simple terms: "${this.selectedText}"`);
      this.showExplanation(this.selectedText, explanation);
    } catch (error) {
      this.showError('Failed to explain text: ' + error.message);
    }
  }

  async adjustReadingDifficulty(level) {
    if (!this.apiKey) {
      this.showError('Please set your API key in the extension settings');
      return;
    }

    const articleText = this.extractArticleText();
    if (!articleText) {
      this.showError('Could not find article content to adjust');
      return;
    }

    const difficultyMap = {
      1: 'very simple, like explaining to a 5th grader',
      2: 'simple, like explaining to an 8th grader',
      3: 'moderate, like explaining to a high school student',
      4: 'advanced, like explaining to a college student',
      5: 'expert level'
    };

    const difficulty = difficultyMap[level] || difficultyMap[3];
    this.showLoading('Adjusting reading difficulty...');
    
    try {
      const adjustedText = await this.callAPI(
        `Please rewrite this text to be ${difficulty}. Keep the same meaning but make it ${difficulty}:\n\n${articleText}`
      );
      this.replaceArticleContent(adjustedText);
      this.hideOverlay();
      this.showTemporaryMessage('Reading difficulty adjusted');
    } catch (error) {
      this.showError('Failed to adjust reading difficulty: ' + error.message);
    }
  }

  async callAPI(prompt) {
    const endpoint = this.provider === 'claude' 
      ? 'https://api.anthropic.com/v1/messages'
      : 'https://api.openai.com/v1/chat/completions';

    const headers = {
      'Content-Type': 'application/json',
    };

    const body = this.provider === 'claude' 
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

    if (this.provider === 'claude') {
      headers['x-api-key'] = this.apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return this.provider === 'claude' 
      ? data.content[0].text
      : data.choices[0].message.content;
  }

  extractArticleText() {
    // Try to find main article content
    const selectors = [
      'article',
      '[role="article"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.innerText || element.textContent;
      }
    }

    // Fallback to body content
    return document.body.innerText || document.body.textContent;
  }

  replaceArticleContent(newText) {
    // Find the main article element and replace its content
    const selectors = [
      'article',
      '[role="article"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        element.innerHTML = `<div class="reading-assistant-adjusted">${newText.replace(/\n/g, '<br>')}</div>`;
        return;
      }
    }

    // Fallback to body
    document.body.innerHTML = `<div class="reading-assistant-adjusted">${newText.replace(/\n/g, '<br>')}</div>`;
  }

  showLoading(message) {
    this.showOverlay();
    this.popup.innerHTML = `
      <button class="close-btn">&times;</button>
      <div style="display: flex; align-items: center;">
        <div class="reading-assistant-loading"></div>
        <span>${message}</span>
      </div>
    `;
    
    this.popup.querySelector('.close-btn').addEventListener('click', () => this.hideOverlay());
  }

  showResult(title, content) {
    this.showOverlay();
    this.popup.innerHTML = `
      <button class="close-btn">&times;</button>
      <h3>${title}</h3>
      <div class="content">${content.replace(/\n/g, '<br>')}</div>
    `;
    
    this.popup.querySelector('.close-btn').addEventListener('click', () => this.hideOverlay());
  }

  showExplanation(term, explanation) {
    this.showOverlay();
    this.popup.innerHTML = `
      <button class="close-btn">&times;</button>
      <h3>Explanation of "${term}"</h3>
      <div class="content">${explanation.replace(/\n/g, '<br>')}</div>
    `;
    
    this.popup.querySelector('.close-btn').addEventListener('click', () => this.hideOverlay());
  }

  showError(message) {
    this.showOverlay();
    this.popup.innerHTML = `
      <button class="close-btn">&times;</button>
      <h3 style="color: #d32f2f;">Error</h3>
      <div class="content">${message}</div>
    `;
    
    this.popup.querySelector('.close-btn').addEventListener('click', () => this.hideOverlay());
  }

  showOverlay() {
    this.overlay.style.display = 'block';
    this.popup.style.display = 'block';
  }

  hideOverlay() {
    this.overlay.style.display = 'none';
    this.popup.style.display = 'none';
  }

  showExplanationOption(x, y) {
    // Could show a small tooltip asking if user wants explanation
    // For now, we'll rely on the popup button
  }

  showTemporaryMessage(message) {
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      z-index: 10003;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    tempDiv.textContent = message;
    document.body.appendChild(tempDiv);

    setTimeout(() => {
      tempDiv.remove();
    }, 3000);
  }
}

// Initialize the reading assistant
new ReadingAssistant();