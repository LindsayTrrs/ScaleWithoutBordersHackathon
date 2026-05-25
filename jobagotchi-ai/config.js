(function () {
  'use strict';
  window.Jobagotchi = window.Jobagotchi || {};
  window.Jobagotchi.Config = Object.freeze({
    WORKER_URL: 'https://jobagotchi-worker.jobagotchi-123.workers.dev',
    AI_TIMEOUT_MS: 25000,
    SCRAPE_DEBOUNCE_MS: 450,
    MAX_DESCRIPTION_CHARS: 12000,
    MAX_RESUME_CHARS: 12000,
    MAX_LOG_ITEMS: 80,
    STORAGE_KEYS: Object.freeze({
      PET: 'petState',
      STATS: 'stats',
      LOG: 'scannedJobsLog',
      RESUME: 'resumeText',
      LAST_JOB_ID: 'lastJobId'
    }),
    DEFAULT_PET: Object.freeze({ name: 'Sweepy-chan', level: 1, xp: 0, happiness: 80, energy: 70 }),
    DEFAULT_STATS: Object.freeze({ scanned: 0, fakes: 0, legit: 0, applied: 0, interviews: 0 })
  });
}());
