/* Perla Homes — contact form -> Telegram group (Vercel serverless function, POST /api/lead)
   The bot token and chat id come only from the Vercel environment variables
   TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID. Never write them in the code or the repo. */
'use strict';

// Same rules as the browser (assets/js/main.js -> initForm)
const LANGS = ['en', 'es', 'ru'];
const LANG_NAMES = { en: 'English', es: 'Español', ru: 'Русский' };
const MSG_MAX = 1000;
const MIN_FILL_MS = 3000;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} '’\-]*$/u;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@(?:[^\s@<>()[\]\\,;:".]+\.)+[^\s@<>()[\]\\,;:".\d]{2,}$/u;
const PHONE_BAD = /[^\d\s+()\-]/;
const LINK_RE = /(?:https?:\/\/|www\.|[\p{L}\d-]+\.(?:com|net|org|info|biz|xyz|top|online|site|club|shop|store|live|pro|app|dev|link|click|io|ru|su|рф|es|eu|uk|de|fr|nl|pl|ua|by|kz|cn|tk|ml|ga|cf|gq|cc|ws|ly|gl)(?![\p{L}\d]))/iu;

const rules = {
  name: (v) => !!v && v.length >= 2 && v.length <= 60 && NAME_RE.test(v),
  email: (v) => !!v && v.length <= 100 && EMAIL_RE.test(v),
  phone: (v) => {
    if (!v) return true;
    const digits = v.replace(/\D/g, '').length;
    return v.length <= 24 && !PHONE_BAD.test(v) && digits >= 7 && digits <= 15;
  },
  language: (v) => LANGS.includes(v),
  message: (v) => v.length <= MSG_MAX && !LINK_RE.test(v),
};

// Rate limit: 5 requests per IP per 10 minutes (best effort — memory lives only as long as the instance)
const RATE = { max: 5, window: 10 * 60 * 1000 };
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, list] of hits) if (!list.some((ts) => now - ts < RATE.window)) hits.delete(k);
  const list = (hits.get(ip) || []).filter((ts) => now - ts < RATE.window);
  if (list.length >= RATE.max) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  return false;
}

// User input as plain text: no control characters; one-line fields stay on one line
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g;
const str = (v) => (typeof v === 'string' ? v : '');
const line = (v) => str(v).replace(/\r\n?|\n/g, ' ').replace(CTRL, '').replace(/\s+/g, ' ').trim();
const text = (v) => str(v).replace(/\r\n?/g, '\n').replace(CTRL, '').trim();

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'method' });
  }
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(res, 415, { ok: false, error: 'json' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { ok: false, error: 'json' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
  if (limited(ip)) return send(res, 429, { ok: false, error: 'rate' });

  // Anti-spam: filled honeypot or a submit faster than a person
  if (str(body.website)) return send(res, 400, { ok: false, error: 'spam' });
  const elapsed = Number(body.elapsed);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) return send(res, 400, { ok: false, error: 'spam' });

  const data = {
    name: line(body.name),
    email: line(body.email),
    phone: line(body.phone),
    language: line(body.language),
    message: text(body.message),
  };
  const invalid = Object.keys(rules).filter((k) => !rules[k](data[k]));
  if (body.consent !== true) invalid.push('consent');
  if (invalid.length) return send(res, 400, { ok: false, error: 'invalid', fields: invalid });

  const property = line(body.property).slice(0, 200);
  const siteLang = LANGS.includes(body.siteLang) ? body.siteLang : '';
  let page = line(body.page).slice(0, 500);
  if (!/^https?:\/\//i.test(page)) page = line(req.headers.referer).slice(0, 500);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date());

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('Telegram env variables missing');
    return send(res, 500, { ok: false, error: 'config' });
  }

  const message = [
    '🏠 New request — Perla Homes',
    `Name: ${data.name}`,
    `E-mail: ${data.email}`,
    `Phone: ${data.phone || '—'}`,
    `Preferred language: ${LANG_NAMES[data.language]}`,
    `Property: ${property || '—'}`,
    `Message: ${data.message || '—'}`,
    `Site language: ${siteLang ? siteLang.toUpperCase() : '—'}`,
    `Page: ${page || '—'}`,
    `Time: ${time} (Europe/Madrid)`,
  ].join('\n');

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10000),
    });
    const out = await r.json().catch(() => null);
    if (!r.ok || !out || out.ok !== true) {
      console.error('Telegram error:', (out && out.description) || `HTTP ${r.status}`);
      return send(res, 502, { ok: false, error: 'telegram' });
    }
  } catch (err) {
    // the error object may carry the request URL (with the token), so log only its name/code
    console.error('Telegram request failed:', (err && (err.name || (err.cause && err.cause.code))) || 'unknown');
    return send(res, 502, { ok: false, error: 'telegram' });
  }

  return send(res, 200, { ok: true });
};
