// background.js — injects scripts on LinkedIn job page navigation

const JS_FILES = [
  'config.js', 'text.js', 'dom.js', 'storage.js',
  'ruleAnalyzer.js', 'linkedinScraper.js', 'workerClient.js',
  'badge.js', 'content.js'
];

function isJobUrl(url) {
  return url && (
    url.includes('linkedin.com/jobs/view/') ||
    url.includes('linkedin.com/jobs/collections/') ||
    url.includes('linkedin.com/jobs/search-results/')
  );
}

async function inject(tabId) {
  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['styles.css'] });
    await chrome.scripting.executeScript({ target: { tabId }, files: JS_FILES });
  } catch (e) {}
}

// Full page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isJobUrl(tab.url)) {
    inject(tabId);
  }
});

// SPA navigation — only fires on URL changes, not DOM mutations
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (isJobUrl(details.url)) inject(details.tabId);
}, { url: [{ hostContains: 'linkedin.com' }] });
