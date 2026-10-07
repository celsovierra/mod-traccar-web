const crypto = require('crypto');
const { pool } = require('./db');
const { sendTelegramMessage, getBotUsername, callTelegram, clearTokenCache, getBotToken } = require('./telegram');
const { processBotInteraction } = require('./bot-menu');

function genCode() {
  return crypto.randomBytes(6).toString('base64').replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase();
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

module.exports = { genCode, sendJson };

async function handleLinkCode(req, res, body) {
  try {
    const data = JSON.parse(body || '{}');
    const userId = Number(data.user_id);
    if (!userId) return sendJson(res, 400, { error: 'user_id obrigatorio' });
    await pool.query('DELETE FROM telegram_link_codes WHERE user_id = ?', [userId]);
    let code = '';
    for (let i = 0; i < 5; i++) {
      const c = genCode();
      try {
        await pool.query('INSERT INTO telegram_link_codes (code, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))', [c, userId]);
        code = c;
        break;
      } catch {}
    }
    if (!code) return sendJson(res, 500, { error: 'Falha ao gerar codigo' });
    const username = await getBotUsername();
    sendJson(res, 200, { code, bot_username: username, deep_link: 'https://t.me/' + username + '?start=' + code, expires_in_min: 30 });
  } catch (e) { sendJson(res, 500, { error: e.message }); }
}

async function handleStatus(req, res, url) {
  try {
    const userId = Number(new URL(url, 'http://x').searchParams.get('user_id'));
    if (!userId) return sendJson(res, 400, { error: 'user_id obrigatorio' });
    const [rows] = await pool.query('SELECT chat_id, username, first_name, linked_at FROM telegram_chats WHERE user_id = ? LIMIT 1', [userId]);
    const username = await getBotUsername();
    const token = await getBotToken();
    if (rows.length > 0) return sendJson(res, 200, { linked: true, chat_id: rows[0].chat_id, bot_username: username, token_configured: !!token });
    sendJson(res, 200, { linked: false, bot_username: username, token_configured: !!token });
  } catch (e) { sendJson(res, 500, { error: e.message }); }
}

async function handleUnlink(req, res, body) {
  try {
    const data = JSON.parse(body || '{}');
    const userId = Number(data.user_id);
    if (!userId) return sendJson(res, 400, { error: 'user_id obrigatorio' });
    await pool.query('DELETE FROM telegram_chats WHERE user_id = ?', [userId]);
    sendJson(res, 200, { ok: true });
  } catch (e) { sendJson(res, 500, { error: e.message }); }
}

async function handleTest(req, res, body) {
  try {
    const data = JSON.parse(body || '{}');
    const userId = Number(data.user_id);
    if (!userId) return sendJson(res, 400, { error: 'user_id obrigatorio' });
    const [rows] = await pool.query('SELECT chat_id FROM telegram_chats WHERE user_id = ? LIMIT 1', [userId]);
    if (rows.length === 0) return sendJson(res, 404, { error: 'Telegram nao vinculado' });
    const r = await sendTelegramMessage(rows[0].chat_id, 'Teste de notificacao. Tudo OK!');
    sendJson(res, 200, r);
  } catch (e) { sendJson(res, 500, { error: e.message }); }
}

async function handleSaveToken(req, res, body) {
  try {
    const data = JSON.parse(body || '{}');
    const token = String(data.token || '').trim();
    const username = String(data.username || '').trim().replace(/^@/, '');
    if (!token) return sendJson(res, 400, { error: 'Token obrigatorio' });
    const [rows] = await pool.query('SELECT id, attributes FROM tc_users WHERE administrator = 1 LIMIT 1');
    if (rows.length === 0) return sendJson(res, 404, { error: 'Admin nao encontrado' });
    const attrs = typeof rows[0].attributes === 'string' ? JSON.parse(rows[0].attributes) : (rows[0].attributes || {});
    attrs.fin_telegram_token = token;
    if (username) attrs.fin_telegram_username = username;
    await pool.query('UPDATE tc_users SET attributes = ? WHERE id = ?', [JSON.stringify(attrs), rows[0].id]);
    clearTokenCache();
    const host = (req.headers && req.headers.host) || 'gpscell.site';
    const proto = (req.headers['x-forwarded-proto'] || 'https');
    const webhookUrl = proto + '://' + host + '/api-telegram/webhook';
    let webhookResult = null;
    try {
      webhookResult = await callTelegram('setWebhook', { url: webhookUrl, allowed_updates: ['message'] });
    } catch (e) { webhookResult = { error: e.message }; }
    sendJson(res, 200, { ok: true, webhook: webhookUrl, webhook_result: webhookResult });
  } catch (e) { sendJson(res, 500, { error: e.message }); }
}

async function handleSetupWebhook(req, res) {
  try {
    const host = (req.headers && req.headers.host) || 'gpscell.site';
    const proto = (req.headers['x-forwarded-proto'] || 'https');
    const url = proto + '://' + host + '/api-telegram/webhook';
    const out = await callTelegram('setWebhook', { url, allowed_updates: ['message'] });
    sendJson(res, 200, { url, result: out });
  } catch (e) { sendJson(res, 500, { error: e.message }); }
}

async function handleWebhook(req, res, body) {
  try {
    const update = JSON.parse(body || '{}');
    const msg = update.message;
    const chat = msg && msg.chat;
    const text = String((msg && msg.text) || '').trim();
    if (!chat || !chat.id || !text) return sendJson(res, 200, { ok: true });

    const chatId = String(chat.id);
    const username = chat.username ? String(chat.username).slice(0, 250) : null;
    const firstName = chat.first_name ? String(chat.first_name).slice(0, 250) : null;

    const m = text.match(/^\/start(?:\@\w+)?\s+([A-Z0-9]{4,16})/i);
    if (m) {
      const code = m[1].toUpperCase();
      const [codeRows] = await pool.query('SELECT user_id FROM telegram_link_codes WHERE code = ? AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1', [code]);
      if (codeRows.length === 0) {
        await sendTelegramMessage(chatId, 'Codigo invalido ou expirado. Gere um novo no app.');
        return sendJson(res, 200, { ok: true });
      }
      const userId = codeRows[0].user_id;
      await pool.query('DELETE FROM telegram_chats WHERE chat_id = ? AND user_id <> ?', [chatId, userId]);
      await pool.query('INSERT INTO telegram_chats (user_id, chat_id, username, first_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE chat_id = VALUES(chat_id), username = VALUES(username), first_name = VALUES(first_name), linked_at = CURRENT_TIMESTAMP', [userId, chatId, username, firstName]);
      await pool.query('DELETE FROM telegram_link_codes WHERE code = ?', [code]);
      await sendTelegramMessage(chatId, 'Telegram vinculado! Voce recebera os alertas aqui.');
      return sendJson(res, 200, { ok: true });
    }

    if (/^\/start\b/i.test(text)) {
      const [rows] = await pool.query('SELECT user_id FROM telegram_chats WHERE chat_id = ? LIMIT 1', [chatId]);
      if (rows.length > 0) await sendTelegramMessage(chatId, 'Ja vinculado! Use /menu.');
      else await sendTelegramMessage(chatId, 'Ola! Gere um codigo no app e envie por aqui.');
      return sendJson(res, 200, { ok: true });
    }

    const [linked] = await pool.query('SELECT user_id FROM telegram_chats WHERE chat_id = ? LIMIT 1', [chatId]);
    if (linked.length > 0) await processBotInteraction(chatId, text, linked[0]);
    else await sendTelegramMessage(chatId, 'Voce nao esta vinculado.');
    sendJson(res, 200, { ok: true });
  } catch (e) {
    console.error('[webhook]', e);
    sendJson(res, 200, { ok: true });
  }
}

module.exports = { genCode, sendJson, handleLinkCode, handleStatus, handleUnlink, handleTest, handleSaveToken, handleSetupWebhook, handleWebhook };
