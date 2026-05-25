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
    }, 500);

    window.addEventListener('pagehide', () => J.Badge.remove(), { once: true });
  }

  async function scanCurrentJob() {
    if (!J.LinkedInScraper.isJobPage()) {
      J.Badge.remove();
      return;
    }

    const jobId = J.LinkedInScraper.getCurrentJobId();
    if (!jobId) return;

    J.Badge.loading('Scanning job posting...');

    await J.LinkedInScraper.waitForDescription(jobId);

    // Bail if user navigated away while waiting
    if (location.href !== lastUrl && J.LinkedInScraper.getCurrentJobId() !== jobId) return;

    const job = J.LinkedInScraper.scrape();

    // Deduplicate — don't re-render same job
    const signature = `${job.id}:${J.Text.hash(job.title + job.company + job.description.slice(0, 500))}`;
    if (signature === lastSignature) return;
    lastSignature = signature;

    if (!job.description) job.description = 'Description could not be loaded.';

    J.Badge.loading('Analyzing legitimacy, scam risk, and resume match...');

    const resume = await J.Storage.get(J.Config.STORAGE_KEYS.RESUME);
    let analysis = J.RuleAnalyzer.analyze(job, resume);

    try {
      const ai = await J.WorkerClient.analyze(job, resume);
      analysis = mergeAnalysis(analysis, ai);
    } catch (err) {
      analysis.reasons.unshift(`ℹ️ Local scan only: ${err.message}`);
    }

    await J.Storage.recordScan(job, analysis);
    J.Badge.render(job, analysis);
  }

  function mergeAnalysis(local, ai) {
    return {
      ...local,
      ...ai,
      score:   Math.round((local.score * 0.35) + (ai.score * 0.65)),
      rating:  finalRating(Math.round((local.score * 0.35) + (ai.score * 0.65))),
      reasons: [...(ai.reasons || []), ...(local.reasons || [])].slice(0, 6),
      source:  'hybrid'
    };
  }

  function finalRating(score) {
    return score >= 80 ? 'LEGIT' : score < 50 ? 'SUSPICIOUS' : 'NEUTRAL';
  }
}());
