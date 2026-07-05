// popup.js
const DASHBOARD_URL = "https://echo-safe-one.vercel.app";

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
    const [{result: pageData}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
         return {
            text: document.body.innerText,
            htmlChunk: document.documentElement.outerHTML.slice(0, 150000) // First 150KB usually contains meta tags, JSON-LD, and price tags
         };
      }
    });

    if (!pageData.text || pageData.text.length < 50) {
      throw new Error('Could not read page content. Try on a product page.');
    }

    statusEl.textContent = 'Analyzing with AI...';

    // Step 3: Send to our Vercel API (which calls Gemini server-side — API key stays safe)
    const apiRes = await fetch(`${DASHBOARD_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: lastScanUrl,
        content: pageData.text.slice(0, 15000), // Just the text for Gemini
        html: pageData.htmlChunk // HTML for regex parsing (price, image)
      })
    });

    if (!apiRes.ok) {
      const errBody = await apiRes.text();
      throw new Error(`API error ${apiRes.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await apiRes.json();
    const details = data.details;

    statusEl.textContent = '';

    // Reconstruct details for rendering
    lastScanDetails = {
      price: details.price || 'Check Site',
      title: details.title || tab.title || 'Scanned Page',
      image: details.image || tab.favIconUrl || '',
      aiFindings: details.aiFindings || [],
      ethics: details.ethics || null,
      alternatives: details.alternatives || []
    };

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
    const payload = JSON.stringify({ url: lastScanUrl, details: lastScanDetails });
    const dashUrl = `${DASHBOARD_URL}/?from_ext=true#${encodeURIComponent(payload)}`;
    chrome.tabs.create({ url: dashUrl });
  });
  resultsEl.appendChild(dashBtn);
}
