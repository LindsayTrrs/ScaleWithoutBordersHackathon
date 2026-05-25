(function () {
  'use strict';
  const { Text } = window.Jobagotchi;
  const CHECKS = [
    { words: ['whatsapp','telegram','google hangout','hangouts','signal app','viber'], delta: -35, reason: 'Interview is pushed to consumer chat apps, a common scam pattern.' },
    { words: ['send you a check','check for equipment','buy your own equipment','purchase equipment','shipping fee','advance fee'], delta: -40, reason: 'Equipment check or advance-fee language is a severe scam indicator.' },
    { words: ['package handler','reshipping','forwarding packages','re-shipping','mailing assistant'], delta: -35, reason: 'Package forwarding roles are high risk and often fraudulent.' },
    { words: ['no experience needed','make money fast','quick cash','work 1-2 hours a day'], delta: -20, reason: 'Vague high-income promise with low effort is suspicious.' },
    { words: ['technical interview','coding challenge','panel interview','phone screen','background check'], delta: 10, reason: 'Structured interview process is a legitimacy signal.' },
    { words: ['health insurance','dental','paid time off','pto','parental leave','rrsp','401k','401(k)'], delta: 10, reason: 'Specific benefits are a positive employer-quality signal.' },
    { words: ['gmail.com','yahoo.com','outlook.com'], delta: -20, reason: 'Recruiter uses free email provider instead of company domain.' },
    { words: ['urgent hiring','immediate start','start immediately'], delta: -15, reason: 'Pressure hiring language is suspicious.' },
    { words: ['bitcoin','crypto payment','usdt'], delta: -50, reason: 'Crypto-related payment language is a major scam signal.' },
    { words: ['data entry'], delta: -10, reason: 'Remote data entry jobs are commonly abused in scams.' },
    { words: ['$100/hour','$80/hour','$70/hour'], delta: -25, reason: 'Unrealistically high pay is suspicious.' },
    { words: ['no interview required','instant hire'], delta: -40, reason: 'Legitimate employers almost always interview candidates.' },
    { words: ['training fee','application fee'], delta: -50, reason: 'Fees are a severe scam indicator.' },
    { words: ['kindly'], delta: -8, reason: 'Overly formal scam-style wording detected.' },
    { words: ['work from your phone'], delta: -25, reason: 'Low-effort income language is suspicious.' },
    { words: ['limited spots available'], delta: -15, reason: 'Artificial urgency is suspicious.' },
    { words: ['benefits package','health insurance','dental insurance'], delta: 10, reason: 'Detailed benefits improve legitimacy.' },
    { words: ['software engineer','backend engineer','frontend engineer'], delta: 5, reason: 'Clear technical role title detected.' },
    { words: ['responsibilities','requirements','qualifications'], delta: 10, reason: 'Structured job posting format detected.' },
    { words: ['linkedin easy apply'], delta: 5, reason: 'LinkedIn-integrated applications are safer.' },
      ];
  const skills = ['javascript','typescript','react','node','python','java','sql','aws','docker','kubernetes','git','agile','salesforce','fastapi','postgresql','mongodb'];
  const RuleAnalyzer = {
    analyze(job, resumeText = '') {
      const text = Text.clean(`${job.title} ${job.company} ${job.description} ${job.location || ''}`, 25000).toLowerCase();
      let score = 62;
      if (
        !job.company ||
        job.company.length < 3 ||
        job.company.toLowerCase().includes('confidential')
      ) {
        score -= 20;
        reasons.push('Company identity is vague or missing.');
        }
      const reasons = [];
      CHECKS.forEach(c => { if (c.words.some(w => text.includes(w))) { score += c.delta; reasons.push(c.reason); } });
      if ((job.description || '').length < 300) { score -= 30; reasons.push('Job description is unusually short.'); }
      const matchedSkills = skills.filter(s => text.includes(s));
      if (matchedSkills.length >= 3) { score += 6; reasons.push('The posting lists concrete, standard role skills.'); }
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
      rating:
  score >= 75
    ? 'LEGIT'
    : score < 45
      ? 'SUSPICIOUS'
      : 'NEUTRAL',
      reasons: reasons.slice(0, 6),
      skills: { required: matchedSkills, matched: resumeMatches, missing: matchedSkills.filter(s => !resumeMatches.includes(s)), matchScore },
      feedback: matchedSkills.length ? `Resume match is ${matchScore}%. Add evidence for missing skills: ${matchedSkills.filter(s => !resumeMatches.includes(s)).slice(0, 5).join(', ') || 'none'}.` : 'Add a resume in the popup for stronger skill matching.',
      isRemote 
      };
    }
  };
  window.Jobagotchi.RuleAnalyzer = RuleAnalyzer;
}());
