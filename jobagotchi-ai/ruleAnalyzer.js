(function () {
  'use strict';
  const { Text } = window.Jobagotchi;
  const CHECKS = [
    { words: ['whatsapp','telegram','google hangout','hangouts','signal app','viber'], delta: -35, reason: 'Interview is pushed to consumer chat apps, a common scam pattern.' },
    { words: ['send you a check','check for equipment','buy your own equipment','purchase equipment','shipping fee','advance fee'], delta: -40, reason: 'Equipment check or advance-fee language is a severe scam indicator.' },
    { words: ['package handler','reshipping','forwarding packages','re-shipping','mailing assistant'], delta: -35, reason: 'Package forwarding roles are high risk and often fraudulent.' },
    { words: ['no experience needed','make money fast','quick cash','work 1-2 hours a day'], delta: -20, reason: 'Vague high-income promise with low effort is suspicious.' },
    { words: ['technical interview','coding challenge','panel interview','phone screen','background check'], delta: 10, reason: 'Structured interview process is a legitimacy signal.' },
    { words: ['health insurance','dental','paid time off','pto','parental leave','rrsp','401k','401(k)'], delta: 10, reason: 'Specific benefits are a positive employer-quality signal.' }
  ];
  const skills = ['javascript','typescript','react','node','python','java','sql','aws','docker','kubernetes','git','agile','salesforce','fastapi','postgresql','mongodb'];
  const RuleAnalyzer = {
    analyze(job, resumeText = '') {
      const text = Text.clean(`${job.title} ${job.company} ${job.description} ${job.location || ''}`, 25000).toLowerCase();
      let score = 62;
      const reasons = [];
      CHECKS.forEach(c => { if (c.words.some(w => text.includes(w))) { score += c.delta; reasons.push(c.reason); } });
      if ((job.description || '').length < 300) { score -= 15; reasons.push('Job description is unusually short.'); }
      const matchedSkills = skills.filter(s => text.includes(s));
      if (matchedSkills.length >= 3) { score += 12; reasons.push('The posting lists concrete, standard role skills.'); }
      const resume = Text.clean(resumeText, 25000).toLowerCase();
      const resumeMatches = matchedSkills.filter(s => resume.includes(s));
      const matchScore = matchedSkills.length ? Math.round((resumeMatches.length / matchedSkills.length) * 100) : 0;
      // Local Remote Detection Fallback
      let isRemote = true;
      const nonRemoteIndicators = ['hybrid', 'on-site', 'onsite', 'in-office', 'in office', 'relocate', 'relocation required'];
      const locationLower = (job.location || '').toLowerCase();
      const titleLower = job.title.toLowerCase();

      if (
        nonRemoteIndicators.some(ind => locationLower.includes(ind) || titleLower.includes(ind)) ||
        ((text.includes('onsite') || text.includes('on-site') || text.includes('hybrid')) && !text.includes('fully remote') && !text.includes('100% remote'))
      ) {
        isRemote = false;
      }//
      score = Text.clamp(score, 0, 100);
      return {
      source: 'local-rules',
      score,
      rating: score >= 80 ? 'LEGIT' : score < 50 ? 'SUSPICIOUS' : 'NEUTRAL',
      reasons: reasons.slice(0, 6),
      skills: { required: matchedSkills, matched: resumeMatches, missing: matchedSkills.filter(s => !resumeMatches.includes(s)), matchScore },
      feedback: matchedSkills.length ? `Resume match is ${matchScore}%. Add evidence for missing skills: ${matchedSkills.filter(s => !resumeMatches.includes(s)).slice(0, 5).join(', ') || 'none'}.` : 'Add a resume in the popup for stronger skill matching.',
      isRemote 
      };
    }
  };
  window.Jobagotchi.RuleAnalyzer = RuleAnalyzer;
}());
