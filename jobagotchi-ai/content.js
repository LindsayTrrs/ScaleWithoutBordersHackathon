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

    J.Badge.loading('Scanning job posting...');

    await J.LinkedInScraper.waitForDescription(jobId);

    // Bail if user navigated away while waiting
    if (location.href !== lastUrl && J.LinkedInScraper.getCurrentJobId() !== jobId) return;

    const job = J.LinkedInScraper.scrape();
    const cached = await J.Storage.get(`job_${job.id}`);

    if (cached?.analysis) {
      J.Badge.render(job, cached.analysis);
      return;
    }

    // Deduplicate — don't re-render same job
    const signature = `${job.id}:${J.Text.hash(job.title + job.company + job.description.slice(0, 500))}`;
    if (signature === lastSignature) return;
    lastSignature = signature;

    if (!job.description) job.description = 'Description could not be loaded.';

    J.Badge.loading('Analyzing legitimacy, scam risk, and resume match...');

    const resume = await J.Storage.get(J.Config.STORAGE_KEYS.RESUME);
    let analysis = J.RuleAnalyzer.analyze(job);

    try {
      if (
          analysis.score < 55 ||
          analysis.rating === 'SUSPICIOUS' ||
          analysis.reasons.length <= 1
          ) {
                try {
                  const ai = await J.WorkerClient.analyze(job);
                  analysis = mergeAnalysis(analysis, ai);
                } catch (err) {
                  
                }
            }
    } catch (err) {
      
    }

    await J.Storage.recordScan(job, analysis);
    J.Badge.render(job, analysis);
  }

  function mergeAnalysis(local, ai) {
    return {
      ...local,
      ...ai,
      score: local.score,
      rating: finalRating(local.score),
      reasons: [...(ai.reasons || []), ...(local.reasons || [])].slice(0, 6),
      source:  'hybrid'
    };
  }

  function finalRating(score) {
    return score >= 80 ? 'LEGIT' : score < 50 ? 'SUSPICIOUS' : 'NEUTRAL';
  }
}());
