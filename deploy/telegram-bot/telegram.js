const { pool } = require('./db');

let cachedToken = null;
let cachedAt = 0;
const CACHE_MS = 30000;

async function getBotToken() {
  const now = Date.now();
  if (cachedToken && now - cachedAt < CACHE_MS) return cachedToken;
  try {
    const [rows] = await pool.query("SELECT attributes FROM tc_users WHERE administrator = 1 AND attributes LIKE '%fin_telegram_token%' LIMIT 1");
    if (rows.length > 0) {
      const attrs = typeof rows[0].attributes === 'string' ? JSON.parse(rows[0].attributes) : rows[0].attributes;
      cachedToken = attrs.fin_telegram_token || null;
    }
  } catch {}
  cachedAt = now;
  return cachedToken;
}

async function getBotUsername() {
  try {
    const [rows] = await pool.query("SELECT attributes FROM tc_users WHERE administrator = 1 AND attributes LIKE '%fin_telegram_username%' LIMIT 1");
    if (rows.length > 0) {
      const attrs = typeof rows[0].attributes === 'string' ? JSON.parse(rows[0].attributes) : rows[0].attributes;
      return String(attrs.fin_telegram_username || '').trim().replace(/^@/, '');
    }
  } catch {}
  return '';
}

function clearTokenCache() { cachedToken = null; cachedAt = 0; }

async function callTelegram(method, payload) {
  const token = await getBotToken();
  if (!token) return { ok: false, error: 'Token do bot nao configurado' };
  try {
    const resp = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.ok) return { ok: false, error: data.description || 'HTTP ' + resp.status };
    return { ok: true, result: data.result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function sendTelegramMessage(chatId, text, opts = {}) {
  if (!chatId || !text) return { ok: false, error: 'chatId/text obrigatorios' };
  return callTelegram('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...opts });
}

module.exports = { getBotToken, getBotUsername, clearTokenCache, callTelegram, sendTelegramMessage };
