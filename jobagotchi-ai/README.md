# Jobagotchi Production Refactor

## What changed
- Split one large content script into small MV3-safe vanilla JavaScript modules.
- Removed remote Google Fonts and remote scripts to keep CSP clean.
- Replaced unsafe UI `innerHTML` rendering in content script with DOM node creation and `textContent`.
- Added centralized cached storage helper with schema normalization.
- Added hybrid analysis: local rule scanner always works; Cloudflare Worker/Gemini enriches when configured.
- Added timeout, error fallback, debounced MutationObserver, safer scraping, and duplicate scan prevention.
- Added production Cloudflare Worker with validation, CORS, retries, timeout, JSON normalization, optional KV rate limiting, and cache.

## Setup
1. Deploy the Worker:
   ```bash
   cd jobagotchi-production
   cp worker/wrangler.toml.example wrangler.toml
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler deploy
   ```
2. In `constants/config.js`, replace `WORKER_URL` with your deployed `/analyze` URL.
3. In `manifest.json`, replace the Worker host permission with your Worker domain.
4. Open `chrome://extensions`, enable Developer Mode, and Load unpacked `jobagotchi-production`.

## Optional rate limiting
Create a KV namespace and bind it as `RATE_LIMIT_KV` in `wrangler.toml`. The Worker allows about 30 requests per IP per minute by default.
