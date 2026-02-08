(() => {
  if (window.__readingAssistantInitialized) {
    return;
  }
  window.__readingAssistantInitialized = true;

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

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes.apiKey) {
        this.apiKey = changes.apiKey.newValue;
      }
      if (changes.provider) {
        this.provider = changes.provider.newValue || 'claude';
      }
    });
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
    const articleText = this.extractArticleText();
    if (!articleText) {
      this.showError('Could not find article content to summarize');
      return;
    }

    this.showLoading('Summarizing article...');
    
    try {
      let summary;
      if (this.provider === 'local') {
        summary = this.localSummarize(articleText);
      } else {
        if (!this.apiKey) {
          this.showError('Please set your API key in the extension settings');
          return;
        }
        summary = await this.callAPI(`Please summarize this article in 3-4 bullet points:\n\n${articleText}`);
      }
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

    if (this.provider === 'local') {
      this.showError('Explanation requires an API provider. Choose Claude or OpenAI.');
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
    if (this.provider === 'local') {
      this.showError('Adjusting reading difficulty requires an API provider. Choose Claude or OpenAI.');
      return;
    }

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
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'makeAPICall',
          provider: this.provider,
          apiKey: this.apiKey,
          prompt
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response || !response.success) {
            reject(new Error(response?.error || 'Unknown error'));
            return;
          }

          resolve(response.result);
        }
      );
    });
  }

  localSummarize(text) {
    const cleaned = text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();

    if (!cleaned) {
      return 'No content to summarize.';
    }

    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);

    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'so', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by',
      'from', 'up', 'down', 'out', 'over', 'under', 'again', 'further', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
      'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
      'so', 'than', 'too', 'very', 'can', 'will', 'just', 'don', 'should', 'now', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'this', 'that', 'these', 'those', 'it', 'its', 'as', 'into', 'about'
    ]);

    const wordCounts = new Map();
    const words = cleaned
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .filter((word) => !stopwords.has(word) && word.length > 2);

    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    const sentenceScores = sentences.map((sentence, index) => {
      const sentenceWords = sentence
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);

      let score = 0;
      for (const word of sentenceWords) {
        if (wordCounts.has(word)) {
          score += wordCounts.get(word);
        }
      }

      return { index, sentence, score };
    });

    const targetCount = Math.min(4, Math.max(3, Math.round(sentences.length * 0.2)));
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, targetCount)
      .sort((a, b) => a.index - b.index)
      .map((item) => `• ${item.sentence.trim()}`);

    if (topSentences.length === 0) {
      return 'No content to summarize.';
    }

    return topSentences.join('\n');
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
})();