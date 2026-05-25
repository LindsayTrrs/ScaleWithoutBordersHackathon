(function () {
  'use strict';
  const J = window.Jobagotchi;
  const $ = id => document.getElementById(id);
  document.addEventListener('DOMContentLoaded', init);
  async function init() {
    const data = await J.Storage.bootstrap();
    renderPet(data.petState);
    renderStats(data.stats);
    $('resume').value = data.resumeText || '';
    renderLog(data.scannedJobsLog || []);
    $('saveResume').addEventListener('click', saveResume);
  }
  function renderPet(pet) { $('petName').textContent = pet.name || 'Sweepy-chan'; $('petLevel').textContent = `Level ${pet.level} • ${pet.xp} XP • ${pet.happiness}% happy`; }
  function renderStats(stats) {
    $('stats').replaceChildren(...[
      ['Scanned', stats.scanned], ['Legit', stats.legit], ['Risky', stats.fakes], ['Applied', stats.applied]
    ].map(([label, value]) => stat(label, value)));
  }
  function stat(label, value) { const d = document.createElement('div'); d.className = 'stat'; d.innerHTML = `<strong></strong><span></span>`; d.querySelector('strong').textContent = value || 0; d.querySelector('span').textContent = label; return d; }
  function renderLog(log) {
    const wrap = $('log');
    if (!log.length) { wrap.className = 'log empty'; wrap.textContent = 'No scans yet. Open a LinkedIn job page.'; return; }
    wrap.className = 'log';
    wrap.replaceChildren(...log.map(item => {
      const row = document.createElement('article'); row.className = 'scan';
      const link = document.createElement('a'); link.href = item.url; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = item.title || 'Untitled job';
      const meta = document.createElement('p'); meta.textContent = `${item.company || 'Unknown company'} • ${new Date(item.scannedAt || Date.now()).toLocaleDateString()}`;
      const pill = document.createElement('span'); pill.className = `pill ${(item.rating || '').toLowerCase()}`; pill.textContent = `${item.rating || 'NEUTRAL'} • ${item.score || 0}/100`;
      row.append(link, meta, pill); return row;
    }));
  }
  async function saveResume() {
    await J.Storage.saveResume($('resume').value);
    $('saveState').textContent = 'Saved locally';
    setTimeout(() => { $('saveState').textContent = ''; }, 1800);
  }
}());
