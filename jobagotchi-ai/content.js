(function () {
  'use strict';
  const J = window.Jobagotchi;

  // Handle re-injection from background.js on SPA navigation
  if (window.__jobagotchiRunning) {
    window.__jobagotchiScan && window.__jobagotchiScan();
    return;
  }
  window.__jobagotchiRunning = true;

  let lastSignature = '';
  let lastUrl = location.href;

  const run = J.Dom.debounce(scanCurrentJob, J.Config.SCRAPE_DEBOUNCE_MS);
  window.__jobagotchiScan = run;

  init();

  async function init() {
    await J.Storage.bootstrap();
    run();

    // Only watch for URL changes — NOT DOM mutations
    // Watching DOM mutations causes infinite loop when badge renders
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        lastSignature = '';
        run();
      }
    }, 5000);

    window.addEventListener('pagehide', () => J.Badge.remove(), { once: true });
  }

  async function scanCurrentJob() {
    if (!J.LinkedInScraper.isJobPage()) {
      J.Badge.remove();
      return;
    }

    const jobId = J.LinkedInScraper.getCurrentJobId();
    if (!jobId) return;

    J.Badge.loading('Analyzing legitimacy, scam risk, and resume match...');

    const resume = await J.Storage.get(J.Config.STORAGE_KEYS.RESUME);
    
    // Pass the fetched resume to the local analyzer
    let analysis = J.RuleAnalyzer.analyze(job, resume); 

    try {
      // Ensure AI is always called to perform advanced remote/scam checks
      const ai = await J.WorkerClient.analyze(job, resume); // Pass the resume here too
      analysis = mergeAnalysis(analysis, ai);
    } catch (err) {
      analysis.reasons.unshift(`ℹ️ Local scan only: ${err.message}`);
    }

    await J.Storage.recordScan(job, analysis);
    J.Badge.render(job, analysis);
  }

  function mergeAnalysis(local, ai) {
    // Correctly calculate the 35% local / 65% AI weighted score
    const finalScore = Math.round((local.score * 0.35) + (ai.score * 0.65));
    return {
      ...local,
      ...ai,
      score:   finalScore,
      rating:  finalRating(finalScore),
      reasons: [...(ai.reasons || []), ...(local.reasons || [])].slice(0, 6),
      source:  'hybrid'
    };
  }

  function finalRating(score) {
    return score >= 80 ? 'LEGIT' : score < 50 ? 'SUSPICIOUS' : 'NEUTRAL';
  }
}());
