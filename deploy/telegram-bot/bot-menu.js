const { pool } = require('./db');
const { sendTelegramMessage } = require('./telegram');

const sessions = new Map();
const SESSION_TTL_MS = 5 * 60 * 1000;

function getSession(chatId) {
  const s = sessions.get(chatId);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { sessions.delete(chatId); return null; }
  return s;
}

function setSession(chatId, data) {
  sessions.set(chatId, { ...data, expiresAt: Date.now() + SESSION_TTL_MS });
}

function clearSession(chatId) { sessions.delete(chatId); }

async function listUserDevices(userId) {
  const [rows] = await pool.query('SELECT d.id, d.name, d.category, d.status FROM tc_devices d INNER JOIN tc_user_device ud ON ud.deviceid = d.id WHERE ud.userid = ? ORDER BY d.name', [userId]);
  const out = [];
  for (const d of rows) {
    const [pos] = await pool.query('SELECT latitude, longitude, speed, fixtime FROM tc_positions WHERE deviceid = ? ORDER BY fixtime DESC LIMIT 1', [d.id]);
    out.push({ id: d.id, name: d.name, position: pos[0] || null });
  }
  return out;
}

function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function mainMenuText() {
  return '\u{1F916} <b>Menu</b>\n\u2501\u2501\u2501\u2501\u2501\u2501\n1 Localizar\n2 Comando\n3 Ancora\n\n<i>cancelar</i>';
}

async function actionLocalizar(chatId, device) {
  const p = device.position;
  if (!p || !p.latitude) {
    await sendTelegramMessage(chatId, 'Sem posicao disponivel.');
    return;
  }
  const lat = Number(p.latitude).toFixed(6);
  const lng = Number(p.longitude).toFixed(6);
  const speed = Math.round((p.speed || 0) * 1.852);
  const when = p.fixtime ? new Date(p.fixtime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-';
  const link = 'https://www.google.com/maps?q=' + lat + ',' + lng;
  await sendTelegramMessage(chatId, '\u{1F4CD} <b>' + esc(device.name) + '</b>\n<a href="' + link + '">Abrir no mapa</a>\n' + speed + ' km/h\n' + when);
}

async function actionBloquear(chatId, device, mode) {
  const type = mode === 'block' ? 'engineStop' : 'engineResume';
  const label = mode === 'block' ? 'Bloqueio' : 'Desbloqueio';
  try {
    const response = await fetch('http://127.0.0.1:8082/api/commands/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: device.id, type }),
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    await sendTelegramMessage(chatId, label + ' enviado para ' + esc(device.name));
  } catch (e) {
    await sendTelegramMessage(chatId, 'Falha: ' + esc(e.message));
  }
}

async function processBotInteraction(chatId, text, linked) {
  const norm = String(text || '').trim().toLowerCase();
  if (!norm) return false;

  if (norm === 'cancelar' || norm === '/cancel' || norm === 'sair') {
    clearSession(chatId);
    await sendTelegramMessage(chatId, 'Operacao cancelada.');
    return true;
  }

  const isMenu = /^(\/menu|\/comandos|menu|comandos|oi|ola|hi|hello)\b/i.test(norm);
  if (isMenu) {
    setSession(chatId, { step: 'menu', userId: linked.user_id });
    await sendTelegramMessage(chatId, mainMenuText());
    return true;
  }

  const session = getSession(chatId);
  if (!session) return false;

  if (session.step === 'menu') {
    const action = norm === '1' ? 'localizar' : norm === '2' ? 'bloquear' : norm === '3' ? 'ancora' : null;
    if (!action) {
      await sendTelegramMessage(chatId, 'Responda 1, 2 ou 3.');
      return true;
    }
    const vehicles = await listUserDevices(session.userId);
    if (!vehicles.length) {
      clearSession(chatId);
      await sendTelegramMessage(chatId, 'Nenhum veiculo vinculado.');
      return true;
    }
    if (vehicles.length === 1) {
      const v = vehicles[0];
      if (action === 'localizar') { clearSession(chatId); await actionLocalizar(chatId, v); }
      else if (action === 'bloquear') {
        setSession(chatId, { ...session, step: 'block_choice', vehicle: v });
        await sendTelegramMessage(chatId, esc(v.name) + '\n1 Bloquear\n2 Desbloquear');
      } else {
        clearSession(chatId);
        await sendTelegramMessage(chatId, 'Ancora nao implementada.');
      }
      return true;
    }
    setSession(chatId, { ...session, step: 'vehicle', action, vehicles });
    const lines = vehicles.slice(0, 50).map((v, i) => String(i + 1) + '. ' + esc(v.name));
    await sendTelegramMessage(chatId, 'Selecione o veiculo:\n' + lines.join('\n'));
    return true;
  }

  if (session.step === 'vehicle') {
    const idx = parseInt(norm, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= session.vehicles.length) {
      await sendTelegramMessage(chatId, 'Numero invalido.');
      return true;
    }
    const v = session.vehicles[idx];
    if (session.action === 'localizar') { clearSession(chatId); await actionLocalizar(chatId, v); }
    else if (session.action === 'bloquear') {
      setSession(chatId, { ...session, step: 'block_choice', vehicle: v });
      await sendTelegramMessage(chatId, esc(v.name) + '\n1 Bloquear\n2 Desbloquear');
    }
    return true;
  }

  if (session.step === 'block_choice') {
    const mode = norm === '1' ? 'block' : norm === '2' ? 'unblock' : null;
    if (!mode) {
      await sendTelegramMessage(chatId, 'Responda 1 ou 2.');
      return true;
    }
    const v = session.vehicle;
    clearSession(chatId);
    await actionBloquear(chatId, v, mode);
    return true;
  }

  return false;
}

module.exports = { processBotInteraction };
