(function () {
  'use strict';
  const Text = {
    clean(value, max = 20000) {
      return String(value || '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
    },
    clamp(num, min, max) { return Math.max(min, Math.min(max, Number(num) || 0)); },
    jobIdFromUrl(url = location.href) {
      try {
        const parsed = new URL(url);
        const viewMatch = parsed.pathname.match(/\/jobs\/view\/(\d+)/);
        return viewMatch ? viewMatch[1] : parsed.searchParams.get('currentJobId');
      } catch (_) { return null; }
    },
    isLinkedInJobPage() {
      const path = location.pathname;
      return path.startsWith('/jobs/view/') || path.startsWith('/jobs/collections/') || path.startsWith('/jobs/search-results/');
    },
    hash(input) {
      let h = 2166136261;
      const str = String(input || '');
      for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return (h >>> 0).toString(36);
    }
  };
  window.Jobagotchi.Text = Text;
}());
