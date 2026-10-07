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
  return '\u{1F916} <b>Menu</b>\n\u2501\u2501\u2501\u2501\u2501\u2501\n1 Localizar\n\n<i>cancelar</i>';
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
  const when = p.fixtime ? new Date(p.fixtime).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' }) : '-';
  const link = 'https://www.google.com/maps?q=' + lat + ',' + lng;

  // Atributos do device (placa, bloqueio)
  let placa = '-';
  let bloqueado = 'Nao';
  try {
    const [devRows] = await pool.query('SELECT attributes FROM tc_devices WHERE id = ?', [device.id]);
    if (devRows.length) {
      const attrs = typeof devRows[0].attributes === 'string' ? JSON.parse(devRows[0].attributes) : devRows[0].attributes;
      if (attrs && attrs.plate) placa = attrs.plate;
      if (attrs && (attrs.blocked === true || attrs.blocked === 'true')) bloqueado = 'Sim';
    }
  } catch {}

  // Bateria + ignicao (attributes da posicao)
  let bateria = '-';
  try {
    const [posRows] = await pool.query('SELECT attributes FROM tc_positions WHERE deviceid = ? ORDER BY fixtime DESC LIMIT 1', [device.id]);
    if (posRows.length) {
      const attrs = typeof posRows[0].attributes === 'string' ? JSON.parse(posRows[0].attributes) : posRows[0].attributes;
      if (attrs && attrs.power !== undefined) {
        const v = Number(attrs.power);
        bateria = v.toFixed(1) + 'V';
      } else if (attrs && attrs.batteryLevel !== undefined) {
        bateria = attrs.batteryLevel + '%';
      }
    }
  } catch {}

  // Endereco (Nominatim) - so rua e cidade
  let endereco = 'Nao disponivel';
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json&addressdetails=1&accept-language=pt-BR', {
      headers: { 'User-Agent': 'GPScellBot/1.0' },
    });
    const data = await r.json();
    const a = data.address || {};
    const partes = [a.road, a.city || a.town || a.village].filter(Boolean);
    endereco = partes.join(', ') || (data.display_name || '').split(',').slice(0, 2).join(', ') || 'Nao disponivel';
  } catch {}

  const msg = '\u{1F4CD} <b>' + esc(device.name) + '</b>\n'
    + '\u{1F3F7}\u{FE0F} Placa: ' + esc(placa) + '\n'
    + '\u{1F512} Bloqueio: ' + esc(bloqueado) + '\n'
    + '\u{1F50B} Bateria: ' + esc(bateria) + '\n'
    + '\u{1F680} Velocidade: ' + speed + ' km/h\n'
    + '\u{1F5FA}\u{FE0F} Endereco: ' + esc(endereco) + '\n'
    + '\u{1F4C5} Data/Hora: ' + when + '\n\n'
    + '\u{1F310} <a href="' + link + '">Abrir no mapa</a>';

  await sendTelegramMessage(chatId, msg);
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
    const action = norm === '1' ? 'localizar' : null;
    if (!action) {
      await sendTelegramMessage(chatId, 'Responda 1.');
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
      }
      return true;
    }
    setSession(chatId, { ...session, step: 'vehicle', action, vehicles });
    const lines = vehicles.slice(0, 50).map((v, i) => String(i + 1) + '. ' + esc(v.name));
    await sendTelegramMessage(chatId, 'Selecione o veiculo:\n' + lines.join('\n'));
    return true;
  }

  if (session.step === 'vehicle') {
    const q = norm.trim().toLowerCase();
    const busca = session.vehicles.filter((v) => (v.name || '').toLowerCase().includes(q));
    if (busca.length > 0) {
      if (busca.length === 1) {
        const v = busca[0];
        if (session.action === 'localizar') { clearSession(chatId); await actionLocalizar(chatId, v); }
        else if (session.action === 'bloquear') {
          setSession(chatId, { ...session, step: 'block_choice', vehicle: v });
          await sendTelegramMessage(chatId, esc(v.name) + '\n1 Bloquear\n2 Desbloquear');
        }
        return true;
      }
      setSession(chatId, { ...session, step: 'vehicle', action: session.action, vehicles: busca });
      const lines = busca.slice(0, 50).map((v, i) => String(i + 1) + '. ' + esc(v.name));
      await sendTelegramMessage(chatId, 'Encontrados:\n' + lines.join('\n') + '\n\nDigite o numero:');
      return true;
    }
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
}

module.exports = { processBotInteraction };