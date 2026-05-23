// content.js — injected into LinkedIn pages to audit remote jobs and host the Jobagotchi virtual pet.

let currentJobData = null;
let petState = {
  name: "Sweepy-chan",
  level: 1,
  xp: 0,
  happiness: 80,
  energy: 70
};

// Career tips database
const CAREER_TIPS = [
  "💡 Never pay for your own equipment! Legitimate remote companies ship pre-configured laptops directly to you.",
  "💡 Tailor your resume! Scan the job description for specific keywords (like React, SQL, Salesforce) and weave them into your experience.",
  "💡 Beat the ATS! Avoid complex column layouts or images in your resume; standard PDF text layouts are easily parsed by screening tools.",
  "💡 Network on LinkedIn! After applying, search for recruiters or team leads at the company and send a polite, short message.",
  "💡 Keep a folder of portfolio work or code samples ready to share. High-quality remote roles love proven self-sufficiency!",
  "💡 Set up a designated workspace at home. Showing you have a quiet, professional remote setup is a huge interview green flag."
];

// Motivation database
const MOTIVATIONAL_QUOTES = [
  "💖 Master, I believe in you! Let's sweep away those fakes and find your dream remote job!",
  "✨ Finding a job is a numbers game. Each application is a step closer to the perfect 'Yes'!",
  "🧹 Don't let rejection get you down. We're just sweeping away the wrong options to make space for the right one!",
  "🚀 You have amazing skills! Let's keep scanning and find a team that truly appreciates you!",
  "💖 Take a deep breath, Master! A fresh cup of tea and a neat application will work wonders.",
  "🌟 One focused application is better than ten random clicks. You've got the wisdom, I've got the broom!"
];

// Load pet state from storage
function loadPetState(callback) {
  chrome.storage.local.get(['petState', 'stats'], (result) => {
    if (result.petState) {
      petState = result.petState;
    } else {
      // Initialize if not present
      chrome.storage.local.set({ petState });
    }
    if (callback) callback(result.stats || { scanned: 0, fakes: 0, legit: 0, applied: 0, interviews: 0 });
  });
}

// Scrape job information from LinkedIn page DOM
function scrapeJobDetails() {
  // Selectors for LinkedIn Job Details
  const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .jobs-details-top-card__job-title, h1');
  const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .jobs-details-top-card__company-url, .jobs-unified-top-card__primary-description a');
  const descriptionEl = document.querySelector('.jobs-description-content__text, .jobs-description__container, .jobs-box__html-content, #job-details');
  const metaEl = document.querySelector('.job-details-jobs-unified-top-card__job-insight, .jobs-unified-top-card__job-insight, .jobs-unified-top-card__primary-description');

  if (!titleEl && !descriptionEl) return null;

  const title = titleEl ? titleEl.innerText.trim() : "Unknown Job Title";
  const company = companyEl ? companyEl.innerText.trim().replace(/\n/g, '') : "Unknown Company";
  const description = descriptionEl ? descriptionEl.innerText.trim() : "";
  const meta = metaEl ? metaEl.innerText.trim() : "";

  return {
    title,
    company,
    description,
    meta,
    url: window.location.href
  };
}

// Heuristic legitimacy analyzer
function analyzeJob(job) {
  let score = 60; // Baseline score
  const reasons = [];
  const text = (job.title + " " + job.description).toLowerCase();

  // 1. RED FLAGS (Severe penalties)
  // Chat app interview scams
  const chatScams = ["whatsapp", "telegram", "google hangout", "hangouts", "signal app", "viber", "skype interview", "chat interview"];
  let hasChatScam = false;
  chatScams.forEach(word => {
    if (text.includes(word)) hasChatScam = true;
  });
  if (hasChatScam) {
    score -= 35;
    reasons.push("❌ Interview on chat apps (WhatsApp/Telegram/Signal) is a severe scam indicator.");
  }

  // Equipment buying / check cashing scams
  const equipmentScams = ["send you a check", "check for equipment", "reimburse you", "buy your own equipment", "reimbursement check", "purchase equipment", "shipping fee", "advance fee", "purchase a laptop"];
  let hasEquipmentScam = false;
  equipmentScams.forEach(word => {
    if (text.includes(word)) hasEquipmentScam = true;
  });
  if (hasEquipmentScam) {
    score -= 35;
    reasons.push("❌ Mention of sending a check to purchase home equipment is a classic scam format.");
  }

  // Package handler/shipping scams (reshipping mule scams)
  const packageScams = ["package handler", "package processing", "mystery shopper", "reshipping", "forwarding packages", "re-shipping", "mailing assistant"];
  let hasPackageScam = false;
  packageScams.forEach(word => {
    if (text.includes(word)) hasPackageScam = true;
  });
  if (hasPackageScam) {
    score -= 30;
    reasons.push("❌ Reshipping/package forwarding positions are frequently illegal reshipping scams.");
  }

  // Vague high pay or get rich quick claims
  const richScams = ["no experience needed", "$50/hr data entry", "$40/hour", "$100/hr", "immediate hire", "work 1-2 hours a day", "quick cash", "make money fast"];
  let hasRichScam = false;
  richScams.forEach(word => {
    if (text.includes(word)) hasRichScam = true;
  });
  if (hasRichScam) {
    score -= 20;
    reasons.push("⚠️ Vague data entry tasks promising exceptionally high hourly pay are high-risk.");
  }

  // Excessive urgency / exclamation spam
  if (text.includes("apply immediately!!!") || text.includes("urgent hiring") || text.includes("immediate start!!!") || text.match(/!!!/g)?.length > 3) {
    score -= 10;
    reasons.push("⚠️ High pressure language and excessive exclamation marks are unprofessional.");
  }

  // Extremely short job description
  if (job.description.length < 250) {
    score -= 15;
    reasons.push("⚠️ Job description is suspiciously short (lack of role definition).");
  }

  // 2. GREEN FLAGS (Credibility boosters)
  // Specific technical skills/tools
  const techSkills = ["react", "vue", "angular", "python", "sql", "typescript", "aws", "docker", "kubernetes", "salesforce", "excel", "powerbi", "figma", "jira", "git", "scrum", "agile", "c#", "java", "node.js"];
  let matchCount = 0;
  techSkills.forEach(word => {
    if (text.includes(word)) matchCount++;
  });
  if (matchCount >= 3) {
    score += 15;
    reasons.push("✅ Lists specific, standard technical tools and skills required for the role.");
  }

  // Normal corporate benefits
  const benefits = ["health insurance", "dental", "401(k)", "401k", "paid time off", "pto", "vision insurance", "parental leave", "life insurance", "disability", "retirement"];
  let benefitCount = 0;
  benefits.forEach(word => {
    if (text.includes(word)) benefitCount++;
  });
  if (benefitCount >= 2) {
    score += 15;
    reasons.push("✅ Standard employee benefit packages are listed (401k, comprehensive healthcare).");
  }

  // Detailed multi-stage interview process
  const interviewKeywords = ["technical screening", "technical interview", "behavioral interview", "coding challenge", "panel interview", "phone screen", "background check"];
  let hasInterviewDetails = false;
  interviewKeywords.forEach(word => {
    if (text.includes(word)) hasInterviewDetails = true;
  });
  if (hasInterviewDetails) {
    score += 10;
    reasons.push("✅ Explicitly describes a structured, professional multi-stage hiring process.");
  }

  // Bound score limits
  score = Math.max(0, Math.min(100, score));

  // Determine status classification
  let rating = "NEUTRAL";
  if (score >= 80) rating = "LEGIT";
  else if (score < 50) rating = "SUSPICIOUS";

  return {
    score,
    rating,
    reasons
  };
}

// Injects the glassmorphic Jobagotchi widget into the LinkedIn page DOM
function showBadge(job, analysis) {
  // Remove existing elements first
  removeBadge();

  // Create badge element
  const badge = document.createElement('div');
  badge.className = 'jobagotchi-badge';
  badge.id = 'jobagotchi-floating-widget';

  // Determine colors based on ratings
  let themeColor = "#eab308"; // Neutral Yellow
  let ratingLabel = "Neutral Info";
  let themeBg = "rgba(250, 240, 215, 0.95)";
  
  if (analysis.rating === "LEGIT") {
    themeColor = "#10b981"; // Emerald Green
    ratingLabel = "Highly Legitimate";
    themeBg = "rgba(224, 251, 236, 0.95)";
  } else if (analysis.rating === "SUSPICIOUS") {
    themeColor = "#ef4444"; // Rose Red
    ratingLabel = "Scam Alert / Suspicious";
    themeBg = "rgba(254, 226, 226, 0.95)";
  }

  // Create character sprites URLs
  const sweepingImg = chrome.runtime.getURL('icons/jobagotchi_sweeping.png');
  const eatingImg = chrome.runtime.getURL('icons/jobagotchi_eating.png');
  const sadImg = chrome.runtime.getURL('icons/jobagotchi_sad.png');

  // Select initial sprite
  let activeSprite = sweepingImg;
  let bubbleText = `Analyzing this job, Master! Let me clean away the clutter... 🧹`;
  
  if (analysis.rating === "LEGIT") {
    activeSprite = sweepingImg; // sweeping/happy
    bubbleText = `Ooh! This remote job listing is sparkling clean! 💖 Feed me a job cookie so I can level up! 🍪`;
  } else if (analysis.rating === "SUSPICIOUS") {
    activeSprite = sadImg; // sad because it's dirty
    bubbleText = `Eww, gross! Master, this listing looks like a total scam! Let me sweep this garbage away! 🧹🗑️`;
  } else {
    bubbleText = `This job looks pretty average, Master. Take a look at the highlights below!`;
  }

  // Compile Highlights list
  let highlightsHtml = "";
  if (analysis.reasons.length > 0) {
    highlightsHtml = analysis.reasons.map(r => `
      <li style="margin-bottom:6px; display:flex; gap:6px; align-items:flex-start;">
        <span style="font-size:12px; line-height:1.4;">${r}</span>
      </li>
    `).join("");
  } else {
    highlightsHtml = `<li style="color:#666; font-style:italic;">No significant anomalies or standard positive features flagged.</li>`;
  }

  // Check if job has already been fed or logged in this session
  const jobKey = `job_${job.company}_${job.title}`.replace(/\s+/g, '_');

  badge.innerHTML = `
    <!-- Top Bar with Pet Status and close button -->
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(0,0,0,0.06); padding-bottom:8px; margin-bottom:12px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:15px; font-weight:700; color:#1f2937;">🧹 ${petState.name}</span>
        <span style="background:#4f46e5; color:white; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:10px;">Lv.${petState.level}</span>
      </div>
      <div style="display:flex; gap:6px;">
        <button id="jobagotchi-minimize" title="Minimize" style="background:none; border:none; cursor:pointer; font-size:14px; color:#9ca3af; hover:color:#4b5563;">➖</button>
        <button id="jobagotchi-close" title="Close" style="background:none; border:none; cursor:pointer; font-size:14px; color:#9ca3af; hover:color:#ef4444;">✕</button>
      </div>
    </div>

    <!-- Speech bubble and Pet character -->
    <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:16px; min-height:85px; position:relative;">
      <div class="jobagotchi-pet-container" style="position:relative; width:80px; height:80px; flex-shrink:0;">
        <img id="jobagotchi-character" class="jobagotchi-pet jobagotchi-sweeping" src="${activeSprite}" style="width:80px; height:80px; object-fit:contain;" />
      </div>
      <div class="jobagotchi-bubble" style="flex-grow:1; background:white; border:1px solid #e5e7eb; border-radius:12px; padding:10px; font-size:12px; line-height:1.4; color:#374151; box-shadow:0 2px 8px rgba(0,0,0,0.04); position:relative;">
        <div id="jobagotchi-speech-text">${bubbleText}</div>
      </div>
    </div>

    <!-- Legitimacy Score Indicator -->
    <div style="background:${themeBg}; border:1px solid ${themeColor}40; border-radius:12px; padding:12px; margin-bottom:14px; text-align:center;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:${themeColor}; letter-spacing:0.5px;">${ratingLabel}</span>
        <span style="font-size:18px; font-weight:900; color:${themeColor};">${analysis.score}%</span>
      </div>
      <!-- Custom Progress Bar -->
      <div style="background:rgba(0,0,0,0.06); height:8px; border-radius:4px; overflow:hidden;">
        <div style="background:${themeColor}; width:${analysis.score}%; height:100%; transition:width 0.6s cubic-bezier(0.4, 0, 0.2, 1);"></div>
      </div>
    </div>

    <!-- Highlights Panel -->
    <div style="margin-bottom:14px;">
      <h4 style="margin:0 0 6px 0; font-size:11px; font-weight:700; color:#4b5563; text-transform:uppercase; letter-spacing:0.5px;">Audit Highlights</h4>
      <ul style="margin:0; padding:0 0 0 4px; list-style:none; max-height:110px; overflow-y:auto; font-size:12px; color:#4b5563;" class="jobagotchi-highlights">
        ${highlightsHtml}
      </ul>
    </div>

    <!-- Interactive Buttons -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
      <button id="jobagotchi-action-feed" class="jobagotchi-btn" style="background:#10b981; color:white; border:none; padding:8px 10px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:4px; box-shadow:0 2px 4px rgba(16,185,129,0.25); transition:transform 0.1s;" ${analysis.rating !== 'LEGIT' ? 'disabled style="background:#cbd5e1; color:#94a3b8; cursor:not-allowed; box-shadow:none;"' : ''}>
        🍪 Feed Cookie
      </button>
      <button id="jobagotchi-action-apply" class="jobagotchi-btn" style="background:#4f46e5; color:white; border:none; padding:8px 10px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:4px; box-shadow:0 2px 4px rgba(79,70,229,0.25); transition:transform 0.1s;">
        📝 Mark Applied
      </button>
    </div>
    
    <div style="display:grid; grid-template-columns:1fr; gap:8px;">
      <button id="jobagotchi-action-tip" style="background:white; border:1px solid #d1d5db; color:#374151; padding:7px 10px; border-radius:8px; font-size:11px; font-weight:600; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:4px; box-shadow:0 1px 2px rgba(0,0,0,0.05); transition:background 0.2s;">
        💡 Get Career Tip
      </button>
    </div>
  `;

  document.body.appendChild(badge);

  // Set up listeners for the newly injected DOM
  document.getElementById('jobagotchi-close').addEventListener('click', () => {
    removeBadge();
  });

  document.getElementById('jobagotchi-minimize').addEventListener('click', () => {
    minimizeBadge(job, analysis);
  });

  // FEED COOKIE INTERACTION
  const feedBtn = document.getElementById('jobagotchi-action-feed');
  feedBtn.addEventListener('click', () => {
    if (feedBtn.disabled) return;

    // Check storage to avoid double feeding for same job
    chrome.storage.local.get([jobKey], (statusResult) => {
      if (statusResult[jobKey] && statusResult[jobKey].fed) {
        document.getElementById('jobagotchi-speech-text').innerText = `Master, I'm already full from this job cookie! 🍪 Let's find another clean one!`;
        return;
      }

      // Update pet state logic
      petState.xp += 20;
      petState.energy = Math.min(100, petState.energy + 25);
      petState.happiness = Math.min(100, petState.happiness + 15);
      
      // Level up check
      let leveledUp = false;
      const xpNeeded = petState.level * 100;
      if (petState.xp >= xpNeeded) {
        petState.xp -= xpNeeded;
        petState.level += 1;
        leveledUp = true;
      }

      // Change sprite to eating
      const petImg = document.getElementById('jobagotchi-character');
      petImg.src = eatingImg;
      petImg.className = "jobagotchi-pet jobagotchi-eating";

      // Speach text
      const speech = document.getElementById('jobagotchi-speech-text');
      if (leveledUp) {
        speech.innerHTML = `<strong>✨ LEVEL UP! ✨</strong><br>OM NOM NOM! Oh Master! I'm now a level ${petState.level} job assistant! Thank you for the delicious cookie! 🍪🌟`;
      } else {
        speech.innerHTML = `OM NOM NOM! Ahh, delicious clean job cookie! XP +20 🌟 Energy +25%! Thank you, Master! 💖`;
      }

      // Disable feed button
      feedBtn.disabled = true;
      feedBtn.style.background = "#cbd5e1";
      feedBtn.style.color = "#94a3b8";
      feedBtn.style.boxShadow = "none";
      feedBtn.style.cursor = "not-allowed";

      // Save updated petState and update stats in storage
      chrome.storage.local.get(['stats'], (statsResult) => {
        const stats = statsResult.stats || { scanned: 0, fakes: 0, legit: 0, applied: 0, interviews: 0 };
        // Increment legit jobs found if not already accounted for
        if (!statusResult[jobKey]) {
          stats.legit = (stats.legit || 0) + 1;
        }

        // Store status of this job as fed
        const jobRecord = statusResult[jobKey] || { fed: true, applied: false, score: analysis.score, company: job.company, title: job.title };
        jobRecord.fed = true;

        chrome.storage.local.set({
          petState: petState,
          stats: stats,
          [jobKey]: jobRecord
        });
      });
    });
  });

  // MARK APPLIED INTERACTION
  const applyBtn = document.getElementById('jobagotchi-action-apply');
  
  // Set initial status of Apply button
  chrome.storage.local.get([jobKey], (statusResult) => {
    if (statusResult[jobKey] && statusResult[jobKey].applied) {
      applyBtn.disabled = true;
      applyBtn.innerText = "✓ Applied!";
      applyBtn.style.background = "#cbd5e1";
      applyBtn.style.color = "#94a3b8";
      applyBtn.style.boxShadow = "none";
      applyBtn.style.cursor = "not-allowed";
    }
  });

  applyBtn.addEventListener('click', () => {
    if (applyBtn.disabled) return;

    applyBtn.disabled = true;
    applyBtn.innerText = "✓ Applied!";
    applyBtn.style.background = "#cbd5e1";
    applyBtn.style.color = "#94a3b8";
    applyBtn.style.boxShadow = "none";
    applyBtn.style.cursor = "not-allowed";

    // Play visual feedback inside speech bubble
    document.getElementById('jobagotchi-speech-text').innerText = `Amazing, Master! I have logged this job in your dashboard! Good luck, you're going to crush the interview! 🚀📝`;

    // Increment applied stats
    chrome.storage.local.get(['stats', 'scannedJobsLog', jobKey], (res) => {
      const stats = res.stats || { scanned: 0, fakes: 0, legit: 0, applied: 0, interviews: 0 };
      stats.applied = (stats.applied || 0) + 1;

      // Update individual job status
      const jobRecord = res[jobKey] || { fed: false, applied: true, score: analysis.score, company: job.company, title: job.title };
      jobRecord.applied = true;

      // Append to scanned jobs list (for popup UI display if not already logged)
      let logList = res.scannedJobsLog || [];
      const logEntry = {
        title: job.title,
        company: job.company,
        score: analysis.score,
        rating: analysis.rating,
        applied: true,
        interview: false,
        url: job.url,
        timestamp: Date.now()
      };
      
      // Prevent duplicates in log
      logList = logList.filter(item => !(item.title === job.title && item.company === job.company));
      logList.unshift(logEntry);
      if (logList.length > 20) logList.pop(); // Keep last 20 jobs

      chrome.storage.local.set({
        stats: stats,
        scannedJobsLog: logList,
        [jobKey]: jobRecord
      });
    });
  });

  // GET CAREER TIP / MOTIVATION INTERACTION
  const tipBtn = document.getElementById('jobagotchi-action-tip');
  tipBtn.addEventListener('click', () => {
    const isTip = Math.random() > 0.5;
    const speech = document.getElementById('jobagotchi-speech-text');
    
    if (isTip) {
      const randomTip = CAREER_TIPS[Math.floor(Math.random() * CAREER_TIPS.length)];
      speech.innerText = randomTip;
    } else {
      const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
      speech.innerText = randomQuote;
    }

    // Give subtle wiggle animation to character
    const petImg = document.getElementById('jobagotchi-character');
    petImg.classList.remove('jobagotchi-sweeping');
    void petImg.offsetWidth; // Trigger reflow
    petImg.classList.add('jobagotchi-sweeping');
  });
}

// Minimizes the large badge to a tiny floating icon
function minimizeBadge(job, analysis) {
  removeBadge();

  const mini = document.createElement('div');
  mini.className = 'jobagotchi-mini-badge';
  mini.id = 'jobagotchi-floating-mini';

  const petImg = chrome.runtime.getURL(analysis.rating === 'SUSPICIOUS' ? 'icons/jobagotchi_sad.png' : 'icons/jobagotchi_sweeping.png');

  let ratingBg = "#eab308";
  if (analysis.rating === "LEGIT") ratingBg = "#10b981";
  else if (analysis.rating === "SUSPICIOUS") ratingBg = "#ef4444";

  mini.innerHTML = `
    <img src="${petImg}" style="width:40px; height:40px; object-fit:contain; cursor:pointer;" />
    <span style="position:absolute; top:-2px; right:-2px; background:${ratingBg}; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow:0 1px 3px rgba(0,0,0,0.2);"></span>
  `;

  document.body.appendChild(mini);

  // Re-expand on click
  mini.addEventListener('click', () => {
    mini.remove();
    showBadge(job, analysis);
  });
}

function removeBadge() {
  const old = document.querySelector('.jobagotchi-badge');
  if (old) old.remove();
  const oldMini = document.querySelector('.jobagotchi-mini-badge');
  if (oldMini) oldMini.remove();
}

function isJobPage() {
  const path = window.location.pathname;
  return (
    path.startsWith('/jobs/view/') ||
    path.startsWith('/jobs/collections/') ||
    window.location.href.includes('/jobs/')
  );
}

// Increments scanned and logged job counts in chrome storage
function logJobScanned(job, analysis) {
  const jobKey = `scanned_${job.company}_${job.title}`.replace(/\s+/g, '_');

  chrome.storage.local.get([jobKey, 'stats', 'scannedJobsLog'], (result) => {
    // If we've already scanned this job in this session, don't increment stats
    if (result[jobKey]) return;

    // Increment overall statistics
    const stats = result.stats || { scanned: 0, fakes: 0, legit: 0, applied: 0, interviews: 0 };
    stats.scanned = (stats.scanned || 0) + 1;
    
    if (analysis.rating === "SUSPICIOUS") {
      stats.fakes = (stats.fakes || 0) + 1;
    } else if (analysis.rating === "LEGIT") {
      stats.legit = (stats.legit || 0) + 1;
    }

    // Append to general logs for pop-up list view
    let logList = result.scannedJobsLog || [];
    const logEntry = {
      title: job.title,
      company: job.company,
      score: analysis.score,
      rating: analysis.rating,
      applied: false,
      interview: false,
      url: job.url,
      timestamp: Date.now()
    };
    
    // Prevent duplicates
    logList = logList.filter(item => !(item.title === job.title && item.company === job.company));
    logList.unshift(logEntry);
    if (logList.length > 20) logList.pop(); // Keep last 20

    const updateObj = {
      stats: stats,
      scannedJobsLog: logList,
      [jobKey]: true
    };

    chrome.storage.local.set(updateObj);
  });
}

// Core executor: crawls page details, triggers scanner and draws visual pet
function run() {
  if (!isJobPage()) {
    removeBadge();
    return;
  }

  // Poll DOM elements to wait until they load since LinkedIn uses dynamic rendering
  let attempts = 0;
  const pollInterval = setInterval(() => {
    const job = scrapeJobDetails();
    attempts++;

    // If description has loaded, run the analyzer
    if (job && job.description.length > 50) {
      clearInterval(pollInterval);
      currentJobData = job;
      
      const analysis = analyzeJob(job);
      logJobScanned(job, analysis);
      
      loadPetState(() => {
        showBadge(job, analysis);
      });
    }

    // Timeout polling after 8 seconds
    if (attempts > 16) {
      clearInterval(pollInterval);
    }
  }, 500);
}

// Observe dynamic navigation in Single Page App (SPA)
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

// Run immediately on injection
run();
