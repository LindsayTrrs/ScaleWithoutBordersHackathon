(function () {
  'use strict';
  const { Dom } = window.Jobagotchi;
  const IDS = { badge: 'jobagotchi-floating-widget', mini: 'jobagotchi-mini-badge' };
  const UI = {
    remove() { document.getElementById(IDS.badge)?.remove(); document.getElementById(IDS.mini)?.remove(); },
    loading(message = 'Scanning this job...') { UI.remove(); document.body.append(Dom.el('aside', { id: IDS.badge, class: 'jobagotchi-badge jobagotchi-loading', role: 'status', 'aria-live': 'polite' }, [avatar('sweeping'), Dom.el('div', { class: 'jobagotchi-content' }, [Dom.el('strong', { text: 'Jobagotchi' }), Dom.el('p', { text: message })])])); },
    render(job, analysis) {
      UI.remove();
      const ratingClass = analysis.rating.toLowerCase();
      
      const children = [
        Dom.el('button', { class: 'jobagotchi-close', type: 'button', 'aria-label': 'Minimize Jobagotchi', onclick: () => UI.minimize(job, analysis) }, '×'),
        Dom.el('div', { class: 'jobagotchi-header' }, [avatar(analysis.rating === 'SUSPICIOUS' ? 'sad' : analysis.rating === 'LEGIT' ? 'eating' : 'sweeping'), Dom.el('div', {}, [Dom.el('div', { class: 'jobagotchi-title', text: job.title }), Dom.el('div', { class: 'jobagotchi-company', text: job.company })])]),
        Dom.el('div', { class: 'jobagotchi-score-row' }, [Dom.el('span', { class: 'jobagotchi-rating', text: label(analysis.rating) }), Dom.el('strong', { text: `${analysis.score}/100` })]),
        Dom.el('div', { class: 'jobagotchi-meter', 'aria-hidden': 'true' }, Dom.el('span', { style: `width:${analysis.score}%` }))
      ];

      // Inject the non-remote warning banner if applicable
      if (analysis.isRemote === false) {
        children.push(Dom.el('div', { class: 'jobagotchi-warning', text: '⚠️ This job is not remote!' }));
      }

      children.push(
        Dom.el('ul', { class: 'jobagotchi-reasons' }, (analysis.reasons || []).slice(0, 4).map(reason => Dom.el('li', { text: reason }))),
        Dom.el('div', { class: 'jobagotchi-skills' }, [Dom.el('strong', { text: `Resume match: ${analysis.skills?.matchScore || 0}%` }), Dom.el('p', { text: analysis.feedback || 'Paste your resume in the popup for personalized matching.' })])
      );

      const badge = Dom.el('aside', { id: IDS.badge, class: `jobagotchi-badge ${ratingClass}`, role: 'complementary', 'aria-label': 'Jobagotchi job analysis' }, children);
      document.body.append(badge);
    },
    minimize(job, analysis) {
      UI.remove();
      const mini = Dom.el('button', { id: IDS.mini, class: 'jobagotchi-mini-badge', type: 'button', 'aria-label': 'Open Jobagotchi analysis', onclick: () => UI.render(job, analysis) }, avatar(analysis.rating === 'SUSPICIOUS' ? 'sad' : 'sweeping'));
      document.body.append(mini);
    },
    error(message) { UI.loading(message); document.getElementById(IDS.badge)?.classList.add('error'); }
  };
  function avatar(state) {
    const file = state === 'sad' ? 'jobagotchi_sad.png' : state === 'eating' ? 'jobagotchi_eating.png' : 'jobagotchi_sweeping.png';
    return Dom.el('img', { class: `jobagotchi-avatar ${state}`, src: chrome.runtime.getURL(`icons/${file}`), alt: '' });
  }
  function label(rating) { return rating === 'LEGIT' ? 'Highly legitimate' : rating === 'SUSPICIOUS' ? 'Suspicious' : 'Neutral'; }
  window.Jobagotchi.Badge = UI;
}());
