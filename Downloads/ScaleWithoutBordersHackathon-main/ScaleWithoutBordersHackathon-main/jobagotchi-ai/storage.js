(function () {
  'use strict';
  const { Config, Text } = window.Jobagotchi;
  const cache = new Map();
  const getRaw = keys => new Promise(resolve => chrome.storage.local.get(keys, resolve));
  const setRaw = obj => new Promise(resolve => chrome.storage.local.set(obj, resolve));
  const Storage = {
    async get(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      const missing = list.filter(k => !cache.has(k));
      if (missing.length) {
        const values = await getRaw(missing);
        Object.entries(values).forEach(([k, v]) => cache.set(k, v));
      }
      const result = {};
      list.forEach(k => { result[k] = cache.get(k); });
      return Array.isArray(keys) ? result : result[keys];
    },
    async set(obj) { Object.entries(obj).forEach(([k, v]) => cache.set(k, v)); await setRaw(obj); },
    async bootstrap() {
      const keys = Object.values(Config.STORAGE_KEYS);
      const data = await getRaw(keys);
      const pet = validatePet(data[Config.STORAGE_KEYS.PET]);
      const stats = validateStats(data[Config.STORAGE_KEYS.STATS]);
      const log = Array.isArray(data[Config.STORAGE_KEYS.LOG]) ? data[Config.STORAGE_KEYS.LOG].slice(0, Config.MAX_LOG_ITEMS) : [];
      const resume = Text.clean(data[Config.STORAGE_KEYS.RESUME] || '', Config.MAX_RESUME_CHARS);
      const normalized = { [Config.STORAGE_KEYS.PET]: pet, [Config.STORAGE_KEYS.STATS]: stats, [Config.STORAGE_KEYS.LOG]: log, [Config.STORAGE_KEYS.RESUME]: resume };
      Object.entries(normalized).forEach(([k, v]) => cache.set(k, v));
      await setRaw(normalized);
      return normalized;
    },
    async saveResume(resumeText) { await Storage.set({ [Config.STORAGE_KEYS.RESUME]: Text.clean(resumeText, Config.MAX_RESUME_CHARS) }); },
    async recordScan(job, analysis) {
      const keys = Config.STORAGE_KEYS;
      const current = await Storage.get([keys.STATS, keys.LOG, keys.PET]);
      const stats = validateStats(current[keys.STATS]);
      const pet = validatePet(current[keys.PET]);
      stats.scanned += 1;
      if (analysis.rating === 'LEGIT') stats.legit += 1;
      if (analysis.rating === 'SUSPICIOUS') stats.fakes += 1;
      pet.xp += analysis.rating === 'LEGIT' ? 14 : 8;
      pet.happiness = Text.clamp(pet.happiness + (analysis.rating === 'LEGIT' ? 3 : -2), 0, 100);
      pet.energy = Text.clamp(pet.energy - 1, 0, 100);
      if (pet.xp >= pet.level * 100) { pet.xp -= pet.level * 100; pet.level += 1; }
      const record = { id: job.id, title: job.title, company: job.company, url: job.url, rating: analysis.rating, score: analysis.score, scannedAt: Date.now() };
      const oldLog = Array.isArray(current[keys.LOG]) ? current[keys.LOG] : [];
      const log = [record, ...oldLog.filter(x => x.id !== job.id)].slice(0, Config.MAX_LOG_ITEMS);
      await Storage.set({ [keys.STATS]: stats, [keys.PET]: pet, [keys.LOG]: log, [`job_${job.id}`]: { job, analysis, savedAt: Date.now() } });
      return { stats, pet, log };
    }
  };
  function validatePet(value) { return { ...Config.DEFAULT_PET, ...(value && typeof value === 'object' ? value : {}) }; }
  function validateStats(value) { return { ...Config.DEFAULT_STATS, ...(value && typeof value === 'object' ? value : {}) }; }
  window.Jobagotchi.Storage = Storage;
}());
