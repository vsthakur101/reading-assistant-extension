# Reading Assistant Browser Extension

A Chrome/Firefox extension that helps make web content more accessible by providing:

- **Article Summarization**: Get quick summaries of lengthy articles
- **Inline Explanations**: Select any text to get simple explanations
- **Reading Difficulty Adjustment**: Modify content complexity from 5th grade to expert level

## Features

- 🧠 **AI-Powered**: Uses Claude or OpenAI APIs for intelligent content processing
- 📖 **Smart Summarization**: Extracts key points from articles automatically
- 📝 **Term Explanations**: Select any term or concept to get simplified explanations
- 🎚️ **Difficulty Control**: 5-level reading difficulty adjustment
- 🔒 **Secure**: API keys stored locally, never shared
- 🎨 **Clean Interface**: Non-intrusive popup and overlay design

## Installation

1. Clone or download this extension
2. Open Chrome/Edge and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder
5. Click the extension icon to configure your API key

## Setup

1. Click the extension icon in your browser toolbar
2. Choose your preferred AI provider (Claude or OpenAI)
3. Enter your API key:
   - **Claude**: Get key from https://console.anthropic.com/
   - **OpenAI**: Get key from https://platform.openai.com/
4. Click "Save API Key"

## Usage

### Summarize Articles
1. Navigate to any article page
2. Click the extension icon
3. Click "Summarize Article"
4. View the summary in the popup

### Explain Terms
1. Select any text on a webpage
2. Click the extension icon
3. Click "Explain Selected Text"
4. Get a simple explanation

### Adjust Reading Difficulty
1. Go to an article you want to read
2. Click the extension icon
3. Use the slider to select difficulty level (1-5):
   - 1: 5th grade level
   - 2: 8th grade level  
   - 3: High school level
   - 4: College level
   - 5: Expert level
4. Click "Adjust Reading Level"

## Files Structure

```
reading-assistant-extension/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
├── content.js             # Page interaction script
├── content.css            # Styles for overlays and popups
├── background.js          # Service worker
└── README.md              # This file
```

## API Usage

The extension makes API calls to:
- Claude API (claude-3-haiku-20240307 model)
- OpenAI API (gpt-3.5-turbo model)

Costs are minimal due to efficient prompt engineering and token limits.

## Privacy

- API keys are stored locally using Chrome storage
- No data is sent to third-party servers except the AI APIs
- Content processing happens in real-time, not stored
- Extension does not track browsing history

## Compatibility

- Chrome 88+
- Edge 88+
- Firefox 109+ (with manifest v3 support)
- Safari 16+ (with some modifications)

## Contributing

Feel free to submit issues and pull requests to improve the extension!

## License

MIT License