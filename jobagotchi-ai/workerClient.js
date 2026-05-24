(function () {
  'use strict';
  const { Config, Text } = window.Jobagotchi;
  const WorkerClient = {
    async analyze(job, resumeText) {
      if (!Config.WORKER_URL.includes('workers.dev')) throw new Error('Worker URL is not configured.');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Config.AI_TIMEOUT_MS);
      try {
        const res = await fetch(Config.WORKER_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            job: { title: job.title,
                  company: job.company,
                  description: Text.clean(job.description,
                  Config.MAX_DESCRIPTION_CHARS),
                  url: job.url,
                  location: Text.clean(job.location || '', 160)
                },
            resumeText: Text.clean(resumeText, Config.MAX_RESUME_CHARS),
            clientVersion: chrome.runtime.getManifest().version
          })
        });
        const data = await safeJson(res);
        if (!res.ok || !data?.ok) throw new Error(data?.error?.message || `Worker failed with ${res.status}`);
        return normalize(data.analysis);
      } finally { clearTimeout(timer); }
    }
  };
  async function safeJson(res) { try { return await res.json(); } catch (_) { return null; } }
  function normalize(a) {
  return {
    source: 'gemini-worker',
    score: Text.clamp(a?.score, 0, 100),
    rating: ['LEGIT','NEUTRAL','SUSPICIOUS'].includes(a?.rating) ? a.rating : 'NEUTRAL',
    reasons: Array.isArray(a?.reasons) ? a.reasons.slice(0, 6).map(x => Text.clean(x, 220)) : [],
    skills: {
      required: Array.isArray(a?.skills?.required) ? a.skills.required.slice(0, 20).map(x => Text.clean(x, 40)) : [],
      matched: Array.isArray(a?.skills?.matched) ? a.skills.matched.slice(0, 20).map(x => Text.clean(x, 40)) : [],
      missing: Array.isArray(a?.skills?.missing) ? a.skills.missing.slice(0, 20).map(x => Text.clean(x, 40)) : [],
      matchScore: Text.clamp(a?.skills?.matchScore, 0, 100)
    },
    feedback: Text.clean(a?.feedback || '', 500),
    scamSignals: Array.isArray(a?.scamSignals) ? a.scamSignals.slice(0, 6).map(x => Text.clean(x, 160)) : [],
    isRemote: typeof a?.isRemote === 'boolean' ? a.isRemote : true // <-- Add this line
  };
}
  window.Jobagotchi.WorkerClient = WorkerClient;
}());
