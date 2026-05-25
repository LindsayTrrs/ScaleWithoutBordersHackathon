const MODEL = 'gemini-3.5-flash';
const MAX_JOB_CHARS = 12000;
const MAX_RESUME_CHARS = 12000;
const CACHE_TTL_SECONDS = 60 * 60 * 6;

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return cors(null, 204, origin);
    if (request.method !== 'POST') return cors(error('METHOD_NOT_ALLOWED', 'Use POST /analyze'), 405, origin);
    try {
      assertEnv(env);
      await rateLimit(request, env);
      const body = await readJson(request);
      const input = validateInput(body);
      const cacheKey = await makeCacheKey(input);
      const cached = await caches.default.match(cacheKey);
      if (cached) return withCors(cached, origin);
      const analysis = await withRetries(() => callGemini(input, env), 2);
      const response = cors({ ok: true, analysis, meta: { cached: false, model: MODEL } }, 200, origin);
      ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
      return response;
    } catch (err) {
      const status = err.status || 500;
      return cors(error(err.code || 'INTERNAL_ERROR', safeMessage(err, status)), status, origin);
    }
  }
};

function assertEnv(env) {
  if (!env.GEMINI_API_KEY) throw Object.assign(new Error('Missing GEMINI_API_KEY secret'), { status: 500, code: 'CONFIG_ERROR' });
}

async function readJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw Object.assign(new Error('Content-Type must be application/json'), { status: 415, code: 'BAD_CONTENT_TYPE' });
  const text = await request.text();
  if (text.length > 32000) throw Object.assign(new Error('Request too large'), { status: 413, code: 'REQUEST_TOO_LARGE' });
  try { return JSON.parse(text); } catch { throw Object.assign(new Error('Invalid JSON request'), { status: 400, code: 'INVALID_JSON' }); }
}

function validateInput(body) {
  const job = body?.job || {};
  const title = clean(job.title, 160);
  const company = clean(job.company, 120);
  const description = clean(job.description, MAX_JOB_CHARS);
  const url = clean(job.url, 500);
  const location = clean(job.location, 160); // <-- Add this line
  const resumeText = clean(body?.resumeText || '', MAX_RESUME_CHARS);
  if (!title || !description || description.length < 80) throw Object.assign(new Error('Job title and description are required'), { status: 400, code: 'VALIDATION_ERROR' });
  return { job: { title, company, description, url, location }, resumeText };
}

function clean(value, max) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function rateLimit(request, env) {
  if (!env.RATE_LIMIT_KV) return;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
  const current = Number(await env.RATE_LIMIT_KV.get(key) || 0);
  if (current >= 30) throw Object.assign(new Error('Rate limit exceeded'), { status: 429, code: 'RATE_LIMITED' });
  await env.RATE_LIMIT_KV.put(key, String(current + 1), { expirationTtl: 90 });
}

async function callGemini(input, env) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        generationConfig: { temperature: 0.2, topP: 0.8, maxOutputTokens: 2000 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ],
        contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }]
      })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw Object.assign(new Error(data?.error?.message || 'Gemini request failed'), { status: res.status >= 500 ? 502 : 400, code: 'GEMINI_ERROR' });
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return normalizeAnalysis(parseAiJson(text));
  } finally { clearTimeout(timer); }
}

function buildPrompt({ job, resumeText }) {
  return `You are Jobagotchi, a strict job scam detector and resume/job fit analyst.Return ONLY valid JSON matching this schema: {"score": number 0-100, "rating": "LEGIT"|"NEUTRAL"|"SUSPICIOUS", "reasons": string[], "scamSignals": string[], "skills": {"required": string[], "matched": string[], "missing": string[], "matchScore": number 0-100}, "feedback": string, "isRemote": boolean}. Score means legitimacy, not resume fit. Set "isRemote" to true ONLY if the job is fully remote. Set "isRemote" to false if the job is hybrid, onsite, in-office, or requires relocation. Penalize: equipment checks, upfront payment, chat-app interviews, reshipping, vague company, unrealistic pay, crypto/payment mule, pressure tactics. Reward: specific responsibilities, credible company details, normal hiring process, clear skills, benefits. Be concise. JOB_TITLE: ${job.title}\nCOMPANY: ${job.company}\nLOCATION: ${job.location || 'Unknown'}\nURL: ${job.url}\nJOB_DESCRIPTION: ${job.description}\nRESUME_TEXT: ${resumeText || 'No resume provided.'}`;
}

function parseAiJson(text) {
  const cleanText = String(text || '').trim();
  
  // 1. Try parsing the raw text directly
  try { 
    return JSON.parse(cleanText); 
  } catch (rawError) {
    
    // 2. If it fails, extract the JSON block out of any markdown wrapper
    const match = cleanText.match(/\{[\s\S]*\}/);
    if (!match) {
      throw Object.assign(
        new Error(`AI did not return any JSON structure. Raw output (first 2000 chars): "${cleanText.slice(0, 2000) || '(empty response)'}"`), 
        { status: 502, code: 'AI_PARSE_ERROR' }
      );
    }
    
    // 3. Try parsing the extracted JSON block and catch the exact syntax error
    try { 
      return JSON.parse(match[0]); 
    } catch (matchError) { 
      throw Object.assign(
        new Error(`JSON Syntax Error: "${matchError.message}". Cleaned JSON text (first 2000 chars): "${match[0].slice(0, 2000)}"`), 
        { status: 502, code: 'AI_PARSE_ERROR' }
      ); 
    }
  }
}

function normalizeAnalysis(a) {
  const score = clamp(a?.score, 0, 100);
  return {
    score,
    rating: ['LEGIT', 'NEUTRAL', 'SUSPICIOUS'].includes(a?.rating) ? a.rating : (score >= 80 ? 'LEGIT' : score < 50 ? 'SUSPICIOUS' : 'NEUTRAL'),
    reasons: arr(a?.reasons, 6, 220),
    scamSignals: arr(a?.scamSignals, 6, 160),
    skills: {
      required: arr(a?.skills?.required, 20, 40),
      matched: arr(a?.skills?.matched, 20, 40),
      missing: arr(a?.skills?.missing, 20, 40),
      matchScore: clamp(a?.skills?.matchScore, 0, 100)
    },
    feedback: clean(a?.feedback || '', 500),
    isRemote: typeof a?.isRemote === 'boolean' ? a.isRemote : true
  };
}
function arr(value, maxItems, maxChars) { return Array.isArray(value) ? value.slice(0, maxItems).map(x => clean(x, maxChars)).filter(Boolean) : []; }
function clamp(n, min, max) { return Math.max(min, Math.min(max, Number(n) || 0)); }
async function withRetries(fn, retries) {
  let last;
  for (let i = 0; i <= retries; i += 1) {
    try { return await fn(); } catch (err) { last = err; if (err.status && err.status < 500) break; await new Promise(r => setTimeout(r, 250 * (i + 1))); }
  }
  throw last;
}
async function makeCacheKey(input) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${input.job.title}|${input.job.company}|${input.job.description}|${input.resumeText.slice(0, 2000)}`));
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  return new Request(`https://jobagotchi-cache.local/${hex}`);
}
function cors(payload, status, origin) { return new Response(payload ? JSON.stringify(payload) : null, { status, headers: corsHeaders(origin) }); }
function withCors(response, origin) { const h = new Headers(response.headers); Object.entries(corsHeaders(origin)).forEach(([k, v]) => h.set(k, v)); return new Response(response.body, { status: response.status, headers: h }); }
function corsHeaders(origin) {
  const allowed = origin.startsWith('chrome-extension://') || origin === 'https://www.linkedin.com' ? origin : '*';
  return { 'access-control-allow-origin': allowed, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${CACHE_TTL_SECONDS}` };
}
function error(code, message) { return { ok: false, error: { code, message } }; }
function safeMessage(err, status) { return `${err.message} (Status: ${status}, Code: ${err.code})`; }
