// popup.js
const GEMINI_API_KEY = "AIzaSyBkxRtHnc644aiUmWKQ8Uq9OIm55pfsEQk";
// TODO: Update this to your Vercel deployment URL after deploying (e.g. https://your-app.vercel.app)
const DASHBOARD_URL = "http://localhost:3000";

const scanBtn = document.getElementById('scanBtn');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

let lastScanDetails = null;
let lastScanUrl = null;

scanBtn.addEventListener('click', async () => {
  scanBtn.disabled = true;
  scanBtn.textContent = '⏳ Scanning...';
  statusEl.textContent = 'Extracting page content...';
  resultsEl.innerHTML = '';
  lastScanDetails = null;
  lastScanUrl = null;

  try {
    // Step 1: Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('No active tab found');

    lastScanUrl = tab.url;

    // Step 2: Inject a script to scrape visible text from the page
    const [{result: pageText}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText
    });

    if (!pageText || pageText.length < 50) {
      throw new Error('Could not read page content. Try on a product page.');
    }

    statusEl.textContent = 'Sending to Gemini 3.5 Flash...';

    // Step 3: Call Gemini directly
    const cleanContent = pageText.slice(0, 15000);
    const prompt = `
      You are a strict, objective consumer protection AI. Analyze this e-commerce website text.
      
      CRITICAL INSTRUCTION: You MUST return a single, valid JSON object exactly matching the schema below. DO NOT add any extra fields. DO NOT omit any fields. Every field is REQUIRED.
      
      REQUIRED JSON SCHEMA:
      {
        "price": "The product price with currency symbol (e.g. Rs. 500 or $29.99)",
        "findings": [
          {
            "type": "Dark Pattern Name (e.g. Drip Pricing, Urgency, Hidden Costs, Confirm Shaming, Forced Continuity)",
            "severity": "high or medium or low",
            "originalText": "Exact quote from the website text that is deceptive",
            "translation": "Plain English explanation of why this is manipulative",
            "advice": "What the user should do about it"
          }
        ],
        "ethics_score": 50,
        "ethics_transparency": "1-2 sentence assessment of pricing and policy transparency",
        "ethics_sustainability": "1-2 sentence assessment of environmental practices",
        "ethics_labor": "1-2 sentence assessment of labor/supply chain practices",
        "alternative_1_name": "Name of a more ethical alternative product or brand",
        "alternative_1_url": "URL to search for this alternative",
        "alternative_1_reason": "Why this is a better choice",
        "alternative_2_name": "Name of another ethical alternative",
        "alternative_2_url": "URL to search for this alternative",
        "alternative_2_reason": "Why this is a better choice"
      }
      
      RULES:
      - If you find NO dark patterns, return an EMPTY array for findings: []
      - ethics_score must be an integer from 0 to 100
      - Be specific in originalText — quote actual text from the page
      - severity: "high" = actively deceptive, "medium" = misleading, "low" = minor concern
      
      Website URL: ${lastScanUrl}
      Website Text:
      ${cleanContent}
    `;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      throw new Error(`Gemini API error ${geminiRes.status}: ${errBody.slice(0, 200)}`);
    }

    const geminiData = await geminiRes.json();

    statusEl.textContent = 'Parsing AI response...';

    const rawJson = geminiData.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(rawJson);

    // Reconstruct details
    lastScanDetails = {
      price: parsed.price || 'Check Site',
      title: tab.title || 'Scanned Page',
      image: tab.favIconUrl || '',
      aiFindings: (parsed.findings || []).filter(f => f.type && f.originalText),
      ethics: parsed.ethics_score !== undefined ? {
        score: Number(parsed.ethics_score) || 0,
        transparency: parsed.ethics_transparency || 'N/A',
        sustainability: parsed.ethics_sustainability || 'N/A',
        labor: parsed.ethics_labor || 'N/A'
      } : null,
      alternatives: []
    };

    if (parsed.alternative_1_name) {
      lastScanDetails.alternatives.push({
        name: parsed.alternative_1_name,
        url: parsed.alternative_1_url,
        reason: parsed.alternative_1_reason
      });
    }
    if (parsed.alternative_2_name) {
      lastScanDetails.alternatives.push({
        name: parsed.alternative_2_name,
        url: parsed.alternative_2_url,
        reason: parsed.alternative_2_reason
      });
    }

    statusEl.textContent = '';
    renderResults(lastScanDetails);

  } catch (err) {
    console.error(err);
    statusEl.textContent = '';
    resultsEl.innerHTML = `
      <div class="error-card">
        <h3>⚠️ Scan Failed</h3>
        <p>${err.message}</p>
      </div>
    `;
  } finally {
    scanBtn.disabled = false;
    scanBtn.textContent = '🔍 Scan This Page';
  }
});

function renderResults(details) {
  let html = '';

  // Findings
  if (details.aiFindings && details.aiFindings.length > 0) {
    html += '<div class="section-title">🚨 Deceptive Patterns Found</div>';
    details.aiFindings.forEach(f => {
      html += `
        <div class="finding-card ${f.severity}">
          <h3>
            ${f.severity === 'high' ? '🔴' : f.severity === 'medium' ? '🟡' : '🔵'}
            ${f.type}
            <span class="badge ${f.severity}">${f.severity}</span>
          </h3>
          <p>${f.translation}</p>
          <p style="margin-top: 6px;"><code>${f.originalText}</code></p>
          ${f.advice ? `<p style="margin-top: 6px; color: #1d4ed8;">💡 ${f.advice}</p>` : ''}
        </div>
      `;
    });
  } else {
    html += `
      <div class="clear-card">
        <div class="icon">✅</div>
        <h3>No Dark Patterns Found</h3>
        <p>This page appears to be using fair design practices.</p>
      </div>
    `;
  }

  // Ethics
  if (details.ethics) {
    const s = details.ethics.score;
    const tier = s >= 70 ? 'good' : s >= 40 ? 'mid' : 'bad';
    html += `
      <div class="section-title">🌱 Brand Ethics</div>
      <div class="ethics-bar">
        <div class="score-row">
          <div class="score-circle ${tier}">${s}/100</div>
          <div>
            <div style="font-weight:900; font-size:14px;">Ethics Score</div>
            <div style="font-size:11px; color:#888; font-weight:600;">AI-powered brand analysis</div>
          </div>
        </div>
        <div class="ethics-label">🔍 Transparency</div>
        <div class="ethics-detail">${details.ethics.transparency}</div>
        <div class="ethics-label">♻️ Sustainability</div>
        <div class="ethics-detail">${details.ethics.sustainability}</div>
        <div class="ethics-label">🤝 Labor Practices</div>
        <div class="ethics-detail">${details.ethics.labor}</div>
      </div>
    `;
  }

  // Price
  if (details.price && details.price !== 'Check Site') {
    html += `
      <div class="finding-card low">
        <h3>💰 Detected Price</h3>
        <p style="font-size: 18px; font-weight: 900; color: #166534;">${details.price}</p>
      </div>
    `;
  }

  resultsEl.innerHTML = html;

  // Dashboard button — opens the full website which auto-scans independently
  const dashBtn = document.createElement('button');
  dashBtn.className = 'dashboard-btn';
  dashBtn.textContent = '📊 Open Full Dashboard';
  dashBtn.addEventListener('click', () => {
    const dashUrl = `${DASHBOARD_URL}/?url=${encodeURIComponent(lastScanUrl)}&autoscan=true`;
    chrome.tabs.create({ url: dashUrl });
  });
  resultsEl.appendChild(dashBtn);
}
