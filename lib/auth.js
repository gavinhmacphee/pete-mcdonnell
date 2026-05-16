const crypto = require('crypto');

const COOKIE_NAME = 'admin_session';
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function sign(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function createSession(secret) {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(exp);
  return `${payload}.${sign(payload, secret)}`;
}

function verifySession(cookie, secret) {
  if (!cookie || !secret) return false;
  const parts = cookie.split('.');
  if (parts.length !== 2) return false;
  const [exp, sig] = parts;
  const expected = sign(exp, secret);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return parseInt(exp, 10) > Date.now();
}

function parseCookies(header) {
  return (header || '').split(';').reduce((acc, pair) => {
    const [k, ...rest] = pair.trim().split('=');
    if (k) acc[k] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function getSessionCookie(req) {
  return parseCookies(req.headers.cookie || '')[COOKIE_NAME];
}

function setSessionCookie(res, value) {
  const expires = value ? `Max-Age=${MAX_AGE_SECONDS}` : 'Max-Age=0';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${value || ''}; Path=/; HttpOnly; Secure; SameSite=Lax; ${expires}`);
}

function requireAuth(req, res) {
  const secret = process.env.SESSION_SECRET;
  if (!verifySession(getSessionCookie(req), secret)) {
    res.status(401).json({ error: 'Not authenticated' });
    return false;
  }
  return true;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  await new Promise((resolve, reject) => {
    req.on('data', c => (raw += c));
    req.on('end', resolve);
    req.on('error', reject);
  });
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

module.exports = {
  createSession, verifySession, getSessionCookie, setSessionCookie,
  requireAuth, readBody, COOKIE_NAME
};
