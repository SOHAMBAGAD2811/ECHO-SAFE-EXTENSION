// background.js — Minimal service worker for the extension
// All logic now lives in popup.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('Dark Pattern Detector installed');
});
