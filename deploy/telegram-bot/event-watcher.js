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

const TIPOS = Object.keys(EVENT_LABELS);
const INTERVALO_MS = 2000;
let lastId = 0;

function fmtHora(iso) {
  try { return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' }); }
  catch { return iso; }
}

async function processarNovos() {
  try {
    const [rows] = await pool.query(
      'SELECT id, type, deviceid, geofenceid, eventtime FROM tc_events WHERE id > ? AND type IN (' + TIPOS.map(() => '?').join(',') + ') ORDER BY id ASC LIMIT 50',
      [lastId, ...TIPOS]
    );
    if (!rows.length) return;

    for (const evt of rows) {
      lastId = Math.max(lastId, evt.id);

      // notificacoes do tipo
      const [notifs] = await pool.query('SELECT id FROM tc_notifications WHERE type = ?', [evt.type]);
      if (!notifs.length) continue;
      const notifIds = notifs.map((n) => n.id);
      const placeholders = notifIds.map(() => '?').join(',');

      const [users] = await pool.query(
        'SELECT DISTINCT un.userid FROM tc_user_notification un INNER JOIN tc_user_device ud ON ud.userid = un.userid WHERE un.notificationid IN (' + placeholders + ') AND ud.deviceid = ?',
        [...notifIds, evt.deviceid]
      );
      if (!users.length) continue;

      const [dev] = await pool.query('SELECT name FROM tc_devices WHERE id = ?', [evt.deviceid]);
      const nomeDev = dev.length ? dev[0].name : 'Veiculo';

      let info = EVENT_LABELS[evt.type] || { emoji: '\u{1F514}', texto: evt.type };
      if (evt.geofenceid && (evt.type === 'geofenceEnter' || evt.type === 'geofenceExit')) {
        const [gf] = await pool.query('SELECT name FROM tc_geofences WHERE id = ?', [evt.geofenceid]);
        const gfName = gf.length ? String(gf[0].name || '') : '';
        if (/^ANCORA_/i.test(gfName)) {
          info = evt.type === 'geofenceExit'
            ? { emoji: '\u{1F6A8}', texto: 'SAIU DA ANCORA' }
            : { emoji: '\u{2693}', texto: 'ENTROU NA ANCORA' };
        }
      }

      for (const u of users) {
        const [chats] = await pool.query('SELECT chat_id FROM telegram_chats WHERE user_id = ? LIMIT 1', [u.userid]);
        if (!chats.length) continue;

        const msg = info.emoji + ' <b>' + info.texto + '</b>\n'
          + '\u{1F697} ' + nomeDev + '\n'
          + '\u{1F551} ' + fmtHora(evt.eventtime);

        try { await sendTelegramMessage(chats[0].chat_id, msg); } catch (e) {}
      }
    }
  } catch (e) {
    console.error('[watcher]', e.message);
  }
}

async function initWatcher() {
  try {
    const [rows] = await pool.query('SELECT MAX(id) AS m FROM tc_events');
    lastId = rows[0].m || 0;
  } catch (e) { lastId = 0; }
  setInterval(processarNovos, INTERVALO_MS);
  console.log('watcher iniciado (lastId=' + lastId + ')');
}

module.exports = { initWatcher };