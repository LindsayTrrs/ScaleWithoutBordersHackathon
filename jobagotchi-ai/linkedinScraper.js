(function () {
  'use strict';
  const { Text, Dom, Config } = window.Jobagotchi;

  const Scraper = {
    getCurrentJobId: () => Text.jobIdFromUrl(),

    isJobPage() {
      const path = location.pathname;
      const jobId = Text.jobIdFromUrl();
      return (
        path.startsWith('/jobs/view/') ||
        ((path.startsWith('/jobs/collections/') ||
          path.startsWith('/jobs/search-results/')) && Boolean(jobId))
      );
    },

    scrape() {
      const description = findDescription();
      const title       = findTitle();
      const company     = findCompany();
      const id          = Text.jobIdFromUrl() || Text.hash(`${title}|${company}|${location.href}`);
      return {
        id,
        title:       Text.clean(title,       160),
        company:     Text.clean(company,      120),
        description: Text.clean(description,  Config.MAX_DESCRIPTION_CHARS),
        url:         location.href,
        location:    Text.clean(findLocation(), 160)
      };
    },

    waitForDescription(jobId, timeoutMs = 8000) {
      const started = Date.now();
      return new Promise(resolve => {
        const tick = () => {
          if (Text.jobIdFromUrl() !== jobId) return resolve(false);
          if (findDescription().length > 200 || Date.now() - started > timeoutMs) return resolve(true);
          setTimeout(tick, 300);
        };
        tick();
      });
    }
  };

  function findDescription() {
    // Try class-based selectors first
    const selectors = [
      '.jobs-description-content__text',
      '.jobs-box__html-content',
      '#job-details',
    ];
    for (const sel of selectors) {
      const text = document.querySelector(sel)?.innerText?.trim();
      if (text && text.length > 150) return text;
    }

    // Text-anchor fallback — confirmed working on all three page types
    let best = null;
    document.querySelectorAll('div, article, section, span').forEach(el => {
      const text = el.innerText || '';
      if (
        text.includes('About the job') &&
        text.length > 200 &&
        text.length < 30000 &&
        el.children.length < 8
      ) {
        if (!best || text.length < best.innerText.length) best = el;
      }
    });
    return best ? best.innerText.trim() : '';
  }

  function findTitle() {
    const h1 = document.querySelector('h1');
    if (h1?.innerText?.trim().length > 2) return h1.innerText.trim();
    return Dom.firstText([
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
    ]) || document.title.split('|')[0].trim() || 'Unknown title';
  }

  function findCompany() {
    const byClass = Dom.firstText([
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name',
      '[data-testid="job-card-company-name"]',
    ]);
    if (byClass) return byClass;

    // Position-based fallback
    const NAV = new Set(['Home','My Network','Jobs','Messaging','Notifications',
      'Me','For Business','Retry Premium','Apply','Save','Share']);
    let found = null;
    document.querySelectorAll('a').forEach(el => {
      if (found) return;
      const text = el.innerText?.trim();
      const rect = el.getBoundingClientRect();
      if (text && text.length > 1 && text.length < 60 &&
          !NAV.has(text) && rect.top > 50 && rect.top < 250) {
        found = el;
      }
    });
    return found?.innerText?.trim() || 'Unknown company';
  }

  function findLocation() {
  // 1. Grab the primary location text (e.g., "Windsor, ON")
  const primaryDesc = Dom.firstText([
    '.job-details-jobs-unified-top-card__primary-description-container',
    '.jobs-unified-top-card__primary-description'
  ]);
  
  // 2. Locate and grab all job insight pills (e.g., "On-site", "Full-time")
  const insights = Array.from(document.querySelectorAll(
    '.job-details-jobs-unified-top-card__job-insight, .jobs-unified-top-card__job-insight'
  ))
    .map(el => el.innerText?.trim())
    .filter(Boolean)
    .join(' · ');

  // 3. Merge them into a single coherent string
  return `${primaryDesc} · ${insights}`.trim();
  }

  window.Jobagotchi.LinkedInScraper = Scraper;
}());
