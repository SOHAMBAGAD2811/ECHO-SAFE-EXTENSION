# 🕵️ Dark Pattern Detector — Chrome Extension

**AI-powered Chrome extension that detects dark patterns, hidden costs, and deceptive UX on e-commerce websites using Google Gemini.**

Dark Pattern Detector scans any e-commerce webpage in real time, identifies manipulative design tactics, and provides an ethics score for the brand — all powered by the Gemini 2.0 Flash model. It helps consumers make informed decisions by surfacing deceptive patterns that are often invisible to the untrained eye.

---

## ✨ Features

- **🔍 AI-Powered Scanning** — Uses Google Gemini (`gemini-2.0-flash`) to analyze page content for deceptive patterns
- **🚨 Dark Pattern Detection** — Identifies tactics like:
  - Drip Pricing
  - Urgency / Scarcity tactics
  - Hidden Costs & Fees
  - Confirm Shaming
  - Forced Continuity
  - Misdirection & Trick Questions
- **🌱 Brand Ethics Score** — Rates brands on a 0–100 ethics scale with transparency breakdowns
- **💡 Ethical Alternatives** — Suggests more transparent alternatives to flagged brands
- **🖥️ Popup UI** — Quick scan results directly in the extension popup
- **📋 In-Page Overlay** — Detailed scanner overlay injected directly into the webpage
- **📊 Full Dashboard** — "Open Full Dashboard" button links to the companion web app for detailed reports

---

## 📸 Screenshots

> Screenshots coming soon.

---

## 🛠️ Tech Stack

| Layer            | Technology                        |
| ---------------- | --------------------------------- |
| Extension        | Chrome Manifest V3, JavaScript    |
| AI Model         | Google Gemini 2.0 Flash           |
| Styling          | Custom CSS (popup + content)      |
| Companion App    | Next.js (separate repo)           |

---

## 🚀 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/SOHAMBAGAD2811/Dark-Pattern-Detector-Extension.git
cd Dark-Pattern-Detector-Extension
```

### 2. Configure the Backend URL (Optional)

By default, the extension points to the deployed companion app at `https://echo-safe-one.vercel.app`. If you want to run the backend locally, you can update the `DASHBOARD_URL` in `popup.js` and `content.js`.

### 4. Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `Dark-Pattern-Detector-Extension` folder

### 5. Start scanning

Navigate to any e-commerce website (Amazon, Flipkart, etc.) and click the **Dark Pattern Detector** extension icon in your toolbar.

---

## ⚙️ Configuration

### `DASHBOARD_URL`

### `DASHBOARD_URL`

Both `popup.js` and `content.js` reference a `DASHBOARD_URL` constant that points to the companion web dashboard where the API requests are routed:

```js
const DASHBOARD_URL = 'https://echo-safe-one.vercel.app';
```

Change this to `http://localhost:3000` only if you are running the companion app locally for development.

---

## 🧠 How It Works

1. **Content Extraction** — The extension scrapes the visible text content of the current webpage
2. **AI Analysis** — The extracted text is sent to Google Gemini 2.0 Flash with a specialized prompt for dark pattern detection
3. **Pattern Classification** — Gemini identifies and classifies deceptive patterns by type and severity
4. **Ethics Scoring** — The brand is scored on a 0–100 scale based on transparency and practices
5. **Results Display** — Findings are displayed in the popup UI and/or the in-page overlay
6. **Dashboard Sync** — Results can be sent to the companion web app for detailed viewing

---

## 📁 Project Structure

```
Dark-Pattern-Detector-Extension/
├── manifest.json        # Chrome extension manifest (V3)
├── background.js        # Service worker for message routing
├── popup.html           # Extension popup UI
├── popup.js             # Popup logic & Gemini API integration
├── content.js           # In-page content script & overlay scanner
├── content.css          # Styles for the in-page overlay
├── icons/
│   ├── icon16.png       # Toolbar icon
│   ├── icon48.png       # Extension management icon
│   └── icon128.png      # Chrome Web Store icon
├── .gitignore
└── README.md
```

---

## 🔗 Companion App

This extension works alongside the **Dark Pattern Dashboard** — a Next.js web app that provides detailed reports, cached scan results, and a full-featured UI.

👉 **[Dark-Pattern-Unnamed-App](https://github.com/SOHAMBAGAD2811/Dark-Pattern-Unnamed-App)**

Make sure the companion app is running (or use the deployed Vercel link `https://echo-safe-one.vercel.app`) for the "Open Full Dashboard" feature to work.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 👤 Author

**Soham Bagad**
GitHub: [@SOHAMBAGAD2811](https://github.com/SOHAMBAGAD2811)
