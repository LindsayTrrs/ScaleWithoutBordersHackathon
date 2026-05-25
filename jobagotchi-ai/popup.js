// popup.js — Jobagotchi popup UI matching the provided design.

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

const $ = (id) => document.getElementById(id);

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getLevelTitle(level) {
  if (level <= 1) return `Lv.${level} Intern Sweeper`;
  if (level === 2) return `Lv.${level} Junior Sweeper`;
  if (level === 3) return `Lv.${level} Senior Sweeper`;
  if (level === 4) return `Lv.${level} Lead Sweeper`;
  return `Lv.${level} Chief Sweeper`;
}

function loadDashboardData() {
  chrome.storage.local.get(["petState", "stats", "scannedJobsLog"], (result) => {
    if (result.petState) petState = { ...petState, ...result.petState };
    if (result.stats) stats = { ...stats, ...result.stats };
    if (Array.isArray(result.scannedJobsLog)) scannedJobsLog = result.scannedJobsLog;

    renderPetPanel();
    renderStats();
    renderJobsLog();
  });
}

function renderPetPanel() {
  $("pet-name-display").innerText = petState.name;
  $("pet-level-badge").innerText = getLevelTitle(petState.level);

  const avatarImg = $("pet-avatar-img");
  avatarImg.src = petState.energy < 35
    ? "icons/jobagotchi_sad.png"
    : "icons/jobagotchi_sweeping.png";

  const xpNeeded = petState.level * 100;
  const xpPercent = Math.min(100, Math.max(0, (petState.xp / xpNeeded) * 100));
  $("pet-xp-bar").style.width = `${xpPercent}%`;
  $("pet-xp-text").innerText = `${petState.xp} / ${xpNeeded} XP`;

  const energy = Math.min(100, Math.max(0, petState.energy));
  const energyBar = $("pet-energy-bar");
  energyBar.style.width = `${energy}%`;
  energyBar.style.background = energy < 35 ? "#ef4444" : energy < 65 ? "#f59e0b" : "#16c78a";
  $("pet-energy-text").innerText = `${energy}%`;

  $("pet-action-interact").innerText = `❤️ Pet ${petState.name}`;
}

function renderStats() {
  $("stat-scanned").innerText = stats.scanned || 0;
  $("stat-fakes").innerText = stats.fakes || 0;
  $("stat-applied").innerText = stats.applied || 0;
  $("scanned-jobs-count").innerText = scannedJobsLog.length;
}

function renderJobsLog() {
  const container = $("jobs-log-container");
  container.innerHTML = "";

  if (!scannedJobsLog.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div>
          <div style="font-size:34px;margin-bottom:8px;">🧹</div>
          <strong style="color:#111827;">No jobs scanned yet</strong><br>
          Open a LinkedIn job post and ${escapeHtml(petState.name)} will start sweeping.
        </div>
      </div>
    `;
    return;
  }

  scannedJobsLog.forEach((job, index) => {
    const score = Number(job.score || 0);
    const scoreClass = score >= 80 ? "legit" : score < 50 ? "suspicious" : "neutral";
    const rating = job.rating || (score >= 80 ? "LEGIT" : score < 50 ? "SUSPICIOUS" : "NEUTRAL");

    let actionHtml = "";
    if (job.interview) {
      actionHtml = `<span class="status-tag interviewing">🎉 Interview</span>`;
    } else if (job.applied) {
      actionHtml = `
        <div style="display:flex; flex-direction:column; gap:5px; align-items:flex-end;">
          <span class="status-tag">✓ Applied</span>
          <button class="job-btn job-btn-interview" data-index="${index}">📞 Interview</button>
        </div>
      `;
    } else {
      actionHtml = `<button class="job-btn job-btn-apply" data-index="${index}">📝 Apply</button>`;
    }

    const item = document.createElement("article");
    item.className = "job-item";
    item.innerHTML = `
      <div class="job-info">
        <h4 class="job-title" title="${escapeHtml(job.title)}">${escapeHtml(job.title || "Unknown job")}</h4>
        <p class="job-company" title="${escapeHtml(job.company)}">${escapeHtml(job.company || "Unknown company")}</p>
        <div class="job-meta-row">
          <span class="score-badge ${scoreClass}">${score}% ${escapeHtml(rating)}</span>
          <span class="time-ago">${formatTimeAgo(job.timestamp)}</span>
        </div>
      </div>
      <div class="job-actions">${actionHtml}</div>
    `;
    container.appendChild(item);
  });

  document.querySelectorAll(".job-btn-apply").forEach((btn) => {
    btn.addEventListener("click", (e) => markJobApplied(Number(e.currentTarget.dataset.index)));
  });

  document.querySelectorAll(".job-btn-interview").forEach((btn) => {
    btn.addEventListener("click", (e) => markJobInterview(Number(e.currentTarget.dataset.index)));
  });
}

function markJobApplied(index) {
  const job = scannedJobsLog[index];
  if (!job || job.applied) return;

  job.applied = true;
  stats.applied = (stats.applied || 0) + 1;

  const jobKey = `job_${job.company}_${job.title}`.replace(/\s+/g, "_");
  chrome.storage.local.get([jobKey], (result) => {
    const jobRecord = result[jobKey] || {};
    jobRecord.applied = true;

    chrome.storage.local.set({ stats, scannedJobsLog, [jobKey]: jobRecord }, () => {
      renderStats();
      renderJobsLog();
    });
  });
}

function markJobInterview(index) {
  const job = scannedJobsLog[index];
  if (!job || job.interview) return;

  job.interview = true;
  stats.interviews = (stats.interviews || 0) + 1;

  petState.xp += 50;
  petState.happiness = 100;
  petState.energy = Math.min(100, petState.energy + 20);

  const xpNeeded = petState.level * 100;
  if (petState.xp >= xpNeeded) {
    petState.xp -= xpNeeded;
    petState.level += 1;
  }

  chrome.storage.local.set({ stats, scannedJobsLog, petState }, () => {
    renderPetPanel();
    renderStats();
    renderJobsLog();
  });
}

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

function openRenameForm() {
  $("pet-name-display").style.display = "none";
  $("rename-form").style.display = "flex";
  $("rename-input").value = petState.name;
  $("rename-input").focus();
}

function closeRenameForm() {
  $("rename-form").style.display = "none";
  $("pet-name-display").style.display = "inline-flex";
}

function confirmRename() {
  const newName = $("rename-input").value.trim();
  if (newName) {
    petState.name = newName;
    chrome.storage.local.set({ petState }, () => {
      closeRenameForm();
      renderPetPanel();
    });
  } else {
    closeRenameForm();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("pet-name-display").addEventListener("click", openRenameForm);
  $("rename-confirm-btn").addEventListener("click", confirmRename);
  $("rename-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmRename();
    if (e.key === "Escape") closeRenameForm();
  });

  $("pet-action-interact").addEventListener("click", () => {
    const avatarBox = $("pet-avatar-container");
    avatarBox.classList.add("pet-petted");

    petState.happiness = Math.min(100, petState.happiness + 10);
    petState.energy = Math.min(100, petState.energy + 5);

    chrome.storage.local.set({ petState }, () => {
      renderPetPanel();
      setTimeout(() => avatarBox.classList.remove("pet-petted"), 550);
    });
  });

  loadDashboardData();
});
