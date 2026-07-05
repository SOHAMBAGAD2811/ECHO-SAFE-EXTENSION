// content.js
const DASHBOARD_URL = 'https://echo-safe-one.vercel.app';
let overlay = null;

function createOverlay() {
  if (overlay) return overlay;
  
  overlay = document.createElement('div');
  overlay.id = 'dp-scanner-overlay';
  
  const header = document.createElement('h2');
  header.innerText = '🤖 AI Scanner';
  overlay.appendChild(header);
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerText = '✕';
  closeBtn.onclick = () => {
    overlay.classList.remove('active');
  };
  overlay.appendChild(closeBtn);
  
  const contentArea = document.createElement('div');
  contentArea.id = 'dp-content-area';
  overlay.appendChild(contentArea);
  
  document.body.appendChild(overlay);
  return overlay;
}

function startScan() {
  const container = createOverlay();
  
  // Toggle visibility if already scanning
  if (container.classList.contains('active')) {
    container.classList.remove('active');
    return;
  }
  
  container.classList.add('active');
  const contentArea = document.getElementById('dp-content-area');
  contentArea.innerHTML = '<div class="dp-loading-spinner">Analyzing Page Context...<br><small>(Running Gemini/LLaMA 3 Model)</small></div>';
  
  // Scrape page text
  const rawText = document.body.innerText;
  
  // Send to background script which forwards to Next.js API
  chrome.runtime.sendMessage({
    action: "scanPage",
    url: window.location.href,
    content: rawText
  }, (response) => {
    if (!response || !response.success) {
      contentArea.innerHTML = `
        <div class="dp-finding-card severity-high">
          <h4>Connection Error</h4>
          <p>Could not connect to the local AI backend (localhost:3000).</p>
        </div>`;
      return;
    }
    
    renderResults(response.data.details, contentArea);
  });
}

function renderResults(details, container) {
  let html = '';
  
  if (details.aiFindings && details.aiFindings.length > 0) {
    html += '<h3>🚨 Deceptive Patterns</h3>';
    details.aiFindings.forEach(finding => {
      html += `
        <div class="dp-finding-card severity-${finding.severity}">
          <h4>${finding.type}</h4>
          <p><strong>Detected:</strong> "${finding.originalText}"</p>
          <p style="margin-top: 5px;"><strong>Translation:</strong> ${finding.translation}</p>
        </div>
      `;
    });
  } else {
    html += '<div class="dp-finding-card severity-low"><h4>✅ Clear</h4><p>No deceptive patterns found!</p></div>';
  }
  
  if (details.ethics) {
    html += `
      <div class="dp-ethics-section">
        <h3>🌱 Brand Ethics (${details.ethics.score}/100)</h3>
        <p style="font-size: 13px; font-weight: bold; margin-bottom: 5px;">Transparency:</p>
        <p style="font-size: 12px; margin-top:0;">${details.ethics.transparency}</p>
      </div>
    `;
  }
  
  // View Full Dashboard Button
  const btnId = 'dp-dashboard-btn-' + Math.random().toString(36).substr(2, 9);
  html += `
    <div style="margin-top: 20px; text-align: center;">
      <button id="${btnId}" style="display: block; width: 100%; background: black; color: white; text-decoration: none; font-weight: 900; padding: 12px; border-radius: 8px; border: 3px solid black; text-transform: uppercase; cursor: pointer;">
        View Full Dashboard ↗
      </button>
    </div>
  `;
  
  container.innerHTML = html;

  // Add click listener to the button after it's injected
  document.getElementById(btnId).onclick = () => {
    const btn = document.getElementById(btnId);
    btn.innerText = "Loading...";
    btn.style.opacity = "0.7";
    
    fetch(`${DASHBOARD_URL}/api/cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: window.location.href, details: details })
    })
    .then(res => res.json())
    .then(data => {
      if (data.id) {
        window.open(`${DASHBOARD_URL}/?cacheId=${data.id}`, '_blank');
      }
      btn.innerText = "View Full Dashboard ↗";
      btn.style.opacity = "1";
    })
    .catch(err => {
      console.error(err);
      alert("Make sure localhost:3000 is running!");
      btn.innerText = "View Full Dashboard ↗";
      btn.style.opacity = "1";
    });
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleScan") {
    startScan();
  }
});
