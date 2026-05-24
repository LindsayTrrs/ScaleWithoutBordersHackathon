// popup.js — manages the virtual pet states, statistics, and logged job logs in the popup dashboard.

let petState = {
  name: "Sweepy-chan",
  level: 1,
  xp: 0,
  happiness: 80,
  energy: 70
};

let stats = {
  scanned: 0,
  fakes: 0,
  legit: 0,
  applied: 0,
  interviews: 0
};

let scannedJobsLog = [];

// Determine level rank name based on level
function getLevelTitle(level) {
  if (level <= 1) return `Lv.${level} Intern Sweeper`;
  if (level === 2) return `Lv.${level} Junior Maid`;
  if (level === 3) return `Lv.${level} Senior Cleanologist`;
  if (level === 4) return `Lv.${level} Lead Sanitizer`;
  return `Lv.${level} Cleanliness Director 👑`;
}

// Load data from chrome.storage
function loadDashboardData() {
  chrome.storage.local.get(['petState', 'stats', 'scannedJobsLog'], (result) => {
    if (result.petState) petState = result.petState;
    if (result.stats) stats = result.stats;
    if (result.scannedJobsLog) scannedJobsLog = result.scannedJobsLog;

    renderPetPanel();
    renderStats();
    renderJobsLog();
  });
}

// Render the virtual pet status card
function renderPetPanel() {
  // Update name and level title
  document.getElementById('pet-name-display').innerText = petState.name;
  document.getElementById('pet-level-badge').innerText = getLevelTitle(petState.level);

  // Update pet avatar asset depending on energy level
  const avatarImg = document.getElementById('pet-avatar-img');
  if (petState.energy < 35) {
    avatarImg.src = "icons/jobagotchi_sad.webp"; // Sad/exhausted
  } else {
    avatarImg.src = "icons/jobagotchi_sweeping.webp"; // Happy sweeping
  }

  // Update XP Progress Bar
  const xpNeeded = petState.level * 100;
  const xpPercent = Math.min(100, (petState.xp / xpNeeded) * 100);
  document.getElementById('pet-xp-bar').style.width = `${xpPercent}%`;
  document.getElementById('pet-xp-text').innerText = `${petState.xp} / ${xpNeeded} XP`;

  // Update Energy Progress Bar
  document.getElementById('pet-energy-bar').style.width = `${petState.energy}%`;
  document.getElementById('pet-energy-text').innerText = `${petState.energy}%`;

  // Dynamic bar colors based on energy levels
  const energyBar = document.getElementById('pet-energy-bar');
  if (petState.energy < 35) {
    energyBar.style.background = '#ef4444'; // Red for low energy
  } else if (petState.energy < 65) {
    energyBar.style.background = '#f59e0b'; // Amber for medium
  } else {
    energyBar.style.background = '#10b981'; // Green for high
  }

  // Interact button label
  document.getElementById('pet-action-interact').innerText = `❤️ Pet ${petState.name}`;
}

// Render overall stats
function renderStats() {
  document.getElementById('stat-scanned').innerText = stats.scanned || 0;
  document.getElementById('stat-fakes').innerText = stats.fakes || 0;
  document.getElementById('stat-applied').innerText = stats.applied || 0;
  document.getElementById('scanned-jobs-count').innerText = scannedJobsLog.length;
}

// Render scanned jobs logs list
function renderJobsLog() {
  const container = document.getElementById('jobs-log-container');
  container.innerHTML = "";

  if (!scannedJobsLog || scannedJobsLog.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🧹</div>
        <div style="font-weight: 700; font-size: 14px; color: var(--text);">No jobs scanned yet</div>
        <div style="font-size: 11px; max-width: 250px; line-height: 1.4;">Navigate to LinkedIn job postings to let ${petState.name} clean away scams and reward you with cookies!</div>
      </div>
    `;
    return;
  }

  scannedJobsLog.forEach((job, index) => {
    const item = document.createElement('div');
    item.className = 'job-item';

    // Set rating class styles
    let scoreClass = "neutral";
    if (job.score >= 80) scoreClass = "legit";
    else if (job.score < 50) scoreClass = "suspicious";

    const jobKey = `job_${job.company}_${job.title}`.replace(/\s+/g, '_');

    // Build right-side action buttons or status tags
    let actionHtml = "";
    if (job.interview) {
      actionHtml = `<span class="status-tag interviewing">🎉 Interviewing</span>`;
    } else if (job.applied) {
      actionHtml = `
        <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-end;">
          <span class="status-tag applied">✓ Applied</span>
          <button class="job-btn job-btn-interview" data-index="${index}">📞 Interview</button>
        </div>
      `;
    } else {
      actionHtml = `
        <button class="job-btn job-btn-apply" data-index="${index}">📝 Apply</button>
      `;
    }

    item.innerHTML = `
      <div class="job-info">
        <h4 class="job-title" title="${job.title}">${job.title}</h4>
        <p class="job-company" title="${job.company}">${job.company}</p>
        <div class="job-meta-row">
          <span class="score-badge ${scoreClass}">${job.score}% ${job.rating}</span>
          <span style="font-size: 10px; color: var(--text-muted);">${formatTimeAgo(job.timestamp)}</span>
        </div>
      </div>
      <div class="job-actions">
        ${actionHtml}
      </div>
    `;

    container.appendChild(item);
  });

  // Bind click handlers to dynamically updated buttons in logs list
  // 1. Apply click handlers
  document.querySelectorAll('.job-btn-apply').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.target.getAttribute('data-index');
      markJobApplied(idx);
    });
  });

  // 2. Interview click handlers
  document.querySelectorAll('.job-btn-interview').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.target.getAttribute('data-index');
      markJobInterview(idx);
    });
  });
}

// Mark a logged job as Applied
function markJobApplied(index) {
  const job = scannedJobsLog[index];
  if (!job) return;

  job.applied = true;
  stats.applied = (stats.applied || 0) + 1;

  // Sync to individual key so LinkedIn overlay stays in sync
  const jobKey = `job_${job.company}_${job.title}`.replace(/\s+/g, '_');

  chrome.storage.local.get([jobKey], (result) => {
    const jobRecord = result[jobKey] || { fed: false, applied: true, score: job.score, company: job.company, title: job.title };
    jobRecord.applied = true;

    chrome.storage.local.set({
      stats: stats,
      scannedJobsLog: scannedJobsLog,
      [jobKey]: jobRecord
    }, () => {
      // Re-trigger visual updates
      renderStats();
      renderJobsLog();
    });
  });
}

// Mark an applied job as Scheduled Interview
function markJobInterview(index) {
  const job = scannedJobsLog[index];
  if (!job) return;

  job.interview = true;
  stats.interviews = (stats.interviews || 0) + 1;

  // Add huge bonus XP to pet on interview schedule!
  petState.xp += 50;
  petState.happiness = 100;
  petState.energy = Math.min(100, petState.energy + 20);

  // Level up check
  const xpNeeded = petState.level * 100;
  if (petState.xp >= xpNeeded) {
    petState.xp -= xpNeeded;
    petState.level += 1;
  }

  // Sync back to storage
  chrome.storage.local.set({
    stats: stats,
    scannedJobsLog: scannedJobsLog,
    petState: petState
  }, () => {
    renderPetPanel();
    renderStats();
    renderJobsLog();
  });
}

// Format timestamp into relative "time ago" string
function formatTimeAgo(timestamp) {
  if (!timestamp) return "Just now";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// RENAME PET FORM MANAGEMENT
document.getElementById('pet-name-display').addEventListener('click', () => {
  document.getElementById('pet-name-display').style.display = 'none';
  const renameForm = document.getElementById('rename-form');
  renameForm.style.display = 'flex';
  const input = document.getElementById('rename-input');
  input.value = petState.name;
  input.focus();
});

document.getElementById('rename-confirm-btn').addEventListener('click', () => {
  confirmRename();
});

document.getElementById('rename-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    confirmRename();
  }
});

function confirmRename() {
  const newName = document.getElementById('rename-input').value.trim();
  if (newName.length > 0) {
    petState.name = newName;
    chrome.storage.local.set({ petState }, () => {
      document.getElementById('rename-form').style.display = 'none';
      document.getElementById('pet-name-display').style.display = 'flex';
      renderPetPanel();
    });
  } else {
    document.getElementById('rename-form').style.display = 'none';
    document.getElementById('pet-name-display').style.display = 'flex';
  }
}

// PETTING INTERACTION
document.getElementById('pet-action-interact').addEventListener('click', () => {
  // Wiggle avatar container
  const avatarBox = document.getElementById('pet-avatar-container');
  avatarBox.classList.add('pet-petted');
  
  // Increase stats slightly
  petState.happiness = Math.min(100, petState.happiness + 10);
  petState.energy = Math.min(100, petState.energy + 5);

  chrome.storage.local.set({ petState }, () => {
    renderPetPanel();
    
    // Remove wiggle animation after complete
    setTimeout(() => {
      avatarBox.classList.remove('pet-petted');
    }, 500);
  });
});

// Load everything on launch
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
});
