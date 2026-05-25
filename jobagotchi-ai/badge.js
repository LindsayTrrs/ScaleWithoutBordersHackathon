(function () {
  'use strict';
  const { Dom } = window.Jobagotchi;
  const IDS = { badge: 'jobagotchi-floating-widget', mini: 'jobagotchi-mini-badge' };
  const CAREER_TIPS = [
  "💡 Never pay for your own equipment! Legitimate remote companies ship pre-configured laptops directly to you.",
  "💡 Tailor your resume! Scan the job description for specific keywords (like React, SQL, Salesforce) and weave them into your experience.",
  "💡 Beat the ATS! Avoid complex column layouts or images in your resume; standard PDF text layouts are easily parsed by screening tools.",
  "💡 Network on LinkedIn! After applying, search for recruiters or team leads at the company and send a polite, short message.",
  "💡 Keep a folder of portfolio work or code samples ready to share. High-quality remote roles love proven self-sufficiency!",
  "💡 Set up a designated workspace at home. Showing you have a quiet, professional remote setup is a huge interview green flag."
];

const MOTIVATIONAL_QUOTES = [
  "💖 Master, I believe in you! Let's sweep away those fakes and find your dream remote job!",
  "✨ Finding a job is a numbers game. Each application is a step closer to the perfect 'Yes'!",
  "🧹 Don't let rejection get you down. We're just sweeping away the wrong options to make space for the right one!",
  "🚀 You have amazing skills! Let's keep scanning and find a team that truly appreciates you!",
  "💖 Take a deep breath, Master! A fresh cup of tea and a neat application will work wonders.",
  "🌟 One focused application is better than ten random clicks. You've got the wisdom, I've got the broom!"
];

function getRandomTip() {
  const pool = Math.random() > 0.5 ? CAREER_TIPS : MOTIVATIONAL_QUOTES;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getSpeechText(analysis) {
  if (!analysis) return 'Scanning this job, Master! 🧹';
  if (analysis.rating === 'LEGIT') return "Ooh! This listing is sparkling clean! 💖 Looks like a great opportunity!";
  if (analysis.rating === 'SUSPICIOUS') return "Eww! Master, this listing looks like a total scam! Let me sweep this garbage away! 🧹🗑️";
  return "This job looks pretty average, Master. Take a look at the highlights below!";
}
  const UI = {
    remove() { document.getElementById(IDS.badge)?.remove(); document.getElementById(IDS.mini)?.remove(); },
    loading(message = 'Scanning this job...') {
      UI.remove();

      const speechEl = Dom.el('p', {
        class: 'jobagotchi-speech',
        text: getRandomTip()
      });

      document.body.append(Dom.el('aside', {
        id: IDS.badge,
        class: 'jobagotchi-badge jobagotchi-loading',
        role: 'status',
        'aria-live': 'polite'
      }, [
        Dom.el('button', {
          class: 'jobagotchi-close',
          type: 'button',
          'aria-label': 'Close',
          onclick: () => UI.remove()
        }, '×'),
        Dom.el('div', { class: 'jobagotchi-header' }, [
          avatar('sweeping'),
          Dom.el('div', { class: 'jobagotchi-speech-wrapper' }, [speechEl])
        ]),
        Dom.el('p', { class: 'jobagotchi-loading-msg', text: message })
      ]));

      // Cycle through tips every 3 seconds while loading
      const interval = setInterval(() => {
        const badge = document.getElementById(IDS.badge);
        if (!badge || !badge.classList.contains('jobagotchi-loading')) {
          clearInterval(interval);
          return;
        }
        speechEl.style.opacity = '0';
        setTimeout(() => {
          speechEl.textContent = getRandomTip();
          speechEl.style.opacity = '1';
        }, 200);
      }, 3000);
    },
     render(job, analysis) {
      UI.remove();
      const ratingClass = analysis.rating.toLowerCase();

      // Speech bubble
      const speechEl = Dom.el('p', {
        class: 'jobagotchi-speech',
        text: getSpeechText(analysis)
      });

      const children = [
        Dom.el('button', {
          class: 'jobagotchi-close',
          type: 'button',
          'aria-label': 'Minimize Jobagotchi',
          onclick: () => UI.minimize(job, analysis)
        }, '×'),

        // Header with avatar + speech bubble
        Dom.el('div', { class: 'jobagotchi-header' }, [
          avatar(analysis.rating === 'SUSPICIOUS' ? 'sad' : analysis.rating === 'LEGIT' ? 'eating' : 'sweeping'),
          Dom.el('div', { class: 'jobagotchi-speech-wrapper' }, [speechEl])
        ]),

        Dom.el('div', { class: 'jobagotchi-title', text: job.title }),
        Dom.el('div', { class: 'jobagotchi-company', text: job.company }),

        Dom.el('div', { class: 'jobagotchi-score-row' }, [
          Dom.el('span', { class: 'jobagotchi-rating', text: label(analysis.rating) }),
          Dom.el('strong', { text: `${analysis.score}/100` })
        ]),
        Dom.el('div', { class: 'jobagotchi-meter', 'aria-hidden': 'true' },
          Dom.el('span', { style: `width:${analysis.score}%` })
        )
      ];

      // Non-remote warning
      if (analysis.isRemote === false) {
        children.push(Dom.el('div', { class: 'jobagotchi-warning', text: '⚠️ This job is not remote!' }));
      }

      children.push(
        Dom.el('ul', { class: 'jobagotchi-reasons' },
          (analysis.reasons || []).slice(0, 4).map(reason => Dom.el('li', { text: reason }))
        )
      );

      const badge = Dom.el('aside', {
        id: IDS.badge,
        class: `jobagotchi-badge ${ratingClass}`,
        role: 'complementary',
        'aria-label': 'Jobagotchi job analysis'
      }, children);

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
