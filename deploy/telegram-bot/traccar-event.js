const { pool } = require('./db');
const { sendTelegramMessage } = require('./telegram');

const EVENT_LABELS = {
  ignitionOn:  { emoji: '\u{1F525}', texto: 'IGNICAO LIGADA' },
  ignitionOff: { emoji: '\u{1F512}', texto: 'IGNICAO DESLIGADA' },
  geofenceEnter: { emoji: '\u{1F7E2}', texto: 'ENTROU NA CERCA' },
  geofenceExit:  { emoji: '\u{1F534}', texto: 'SAIU DA CERCA' },
  alarm:       { emoji: '\u{1F6A8}', texto: 'ALARME' },
  deviceOnline:  { emoji: '\u{1F7E2}', texto: 'ONLINE' },
  deviceOffline: { emoji: '\u{1F534}', texto: 'OFFLINE' },
};

function formatarData(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' });
  } catch { return iso; }
}

async function handleTraccarEvent(body) {
  let evt;
  try { evt = JSON.parse(body); } catch { return { ok: false, error: 'json invalido' }; }

  const tipo = evt.type;
  const deviceId = evt.deviceId;
  if (!tipo || !deviceId) return { ok: false, error: 'evento sem type/deviceId' };

  // 1) Descobre quais notificacoes (no traccar) cobrem esse tipo
  const [notifs] = await pool.query(
    'SELECT id FROM tc_notifications WHERE type = ?',
    [tipo]
  );
  if (!notifs.length) return { ok: true, sent: 0 };

  const notifIds = notifs.map((n) => n.id);

  // 2) Descobre usuarios que (a) tem a notificacao ativa E (b) tem o device
  const placeholders = notifIds.map(() => '?').join(',');
  const [users] = await pool.query(
    `SELECT DISTINCT un.userid
       FROM tc_user_notification un
       INNER JOIN tc_user_device ud ON ud.userid = un.userid
      WHERE un.notificationid IN (${placeholders})
        AND ud.deviceid = ?`,
    [...notifIds, deviceId]
  );
  if (!users.length) return { ok: true, sent: 0 };

  // 3) Pega nome do device
  const [dev] = await pool.query('SELECT name FROM tc_devices WHERE id = ?', [deviceId]);
  const deviceName = dev.length ? dev[0].name : 'Veiculo';

  // 4) Pra cada usuario com chat vinculado, envia mensagem
  const info = EVENT_LABELS[tipo] || { emoji: '\u{1F514}', texto: tipo };
  let enviados = 0;

  for (const u of users) {
    const [chats] = await pool.query(
      'SELECT chat_id FROM telegram_chats WHERE user_id = ? LIMIT 1',
      [u.userid]
    );
    if (!chats.length) continue;
    const chatId = chats[0].chat_id;

    const msg = info.emoji + ' <b>' + info.texto + '</b>\n'
      + '\u{1F697} ' + deviceName + '\n'
      + '\u{1F551} ' + formatarData(evt.eventTime || evt.serverTime || new Date().toISOString());

    try {
      await sendTelegramMessage(chatId, msg);
      enviados++;
    } catch (e) {
      console.error('[traccar-event] erro enviando pra', chatId, e.message);
    }
  }

  return { ok: true, sent: enviados };
}

module.exports = { handleTraccarEvent };