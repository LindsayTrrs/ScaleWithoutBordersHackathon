// content.js — injected into every LinkedIn page

function isJobPage() {
  return (
    window.location.pathname.startsWith('/jobs/view/') ||
    window.location.pathname.startsWith('/jobs/collections/')
  );
}

function showBadge() {
  if (document.querySelector('.jobagotchi-badge')) return;

  const badge = document.createElement('div');
  badge.className = 'jobagotchi-badge';

  badge.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;">
      <div style="font-size:40px;line-height:1;">🧹</div>
      <div>
        <h2 style="margin:0 0 4px;font-size:15px;">Jobagotchi</h2>
        <div style="font-size:13px;color:#555;">You're on a job page!</div>
      </div>
      <button onclick="this.closest('.jobagotchi-badge').remove()"
        style="background:none;border:none;cursor:pointer;font-size:18px;color:#888;margin-left:auto;">✕</button>
    </div>
  `;

  document.body.appendChild(badge);
}

function removeBadge() {
  const old = document.querySelector('.jobagotchi-badge');
  if (old) old.remove();
}

function run() {
  if (isJobPage()) showBadge();
  else removeBadge();
}

// MutationObserver + polling as dual triggers for SPA navigation
let lastUrl = location.href;

new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    run();
  }
}).observe(document.body, { subtree: true, childList: true });

setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    run();
  }
}, 500);

run();
