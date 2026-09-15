const http = require('http');
const mysql = require('mysql2/promise');

const PORT = process.env.PORT || 8090;
const TRACCAR_URL = process.env.TRACCAR_URL || 'http://127.0.0.1:8082';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'traccar_user';
const DB_PASS = process.env.DB_PASS || '';
const DB_NAME = process.env.DB_NAME || 'traccar';

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
});

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
  });
}

async function checkDeviceAccess(deviceId, cookieHeader) {
  const response = await fetch(`${TRACCAR_URL}/api/devices/${deviceId}`, {
    method: 'GET',
    headers: { Cookie: cookieHeader || '' },
  });
  return response.ok;
}

async function getSessionUser(cookieHeader) {
  const response = await fetch(`${TRACCAR_URL}/api/session`, {
    method: 'GET',
    headers: { Cookie: cookieHeader || '' },
  });
  if (!response.ok) return null;
  return response.json();
}

async function handleDeviceEdit(req, res, deviceId, cookieHeader) {
  const body = await readBody(req);
  try {
    const parsedBody = JSON.parse(body || '{}');
    const model = parsedBody.model;
    const plate = parsedBody.attributes?.plate !== undefined ? parsedBody.attributes.plate : parsedBody.plate;

    const authorized = await checkDeviceAccess(deviceId, cookieHeader);
    if (!authorized) {
      sendJson(res, 403, { error: 'Sem permissao para editar este veiculo' });
      return;
    }

    const [rows] = await pool.query('SELECT attributes FROM tc_devices WHERE id = ?', [deviceId]);
    if (rows.length === 0) {
      sendJson(res, 404, { error: 'Dispositivo nao encontrado' });
      return;
    }

    let attributes = {};
    try {
      attributes = rows[0].attributes ? JSON.parse(rows[0].attributes) : {};
    } catch (e) {
      attributes = {};
    }
    attributes.plate = plate !== undefined ? plate : attributes.plate;

    await pool.query(
      'UPDATE tc_devices SET model = ?, attributes = ? WHERE id = ?',
      [model !== undefined ? model : null, JSON.stringify(attributes), deviceId],
    );

    sendJson(res, 200, { success: true, model, plate: attributes.plate });
  } catch (error) {
    console.error('Erro no device-edit-proxy:', error);
    sendJson(res, 500, { error: 'Erro interno' });
  }
}

async function handleRelayStatus(req, res, deviceId, cookieHeader) {
  try {
    const authorized = await checkDeviceAccess(deviceId, cookieHeader);
    if (!authorized) {
      sendJson(res, 403, { error: 'Sem permissao' });
      return;
    }

    const [rows] = await pool.query(
      "SELECT eventtime, attributes FROM tc_events WHERE deviceid = ? AND type = 'commandResult' ORDER BY eventtime DESC LIMIT 1",
      [deviceId],
    );

    if (rows.length === 0) {
      sendJson(res, 200, { result: null, eventtime: null });
      return;
    }

    let attributes = {};
    try {
      attributes = rows[0].attributes ? JSON.parse(rows[0].attributes) : {};
    } catch (e) {
      attributes = {};
    }

    const resultText = String(attributes.result || '').toUpperCase();
    let blocked = null;
    if (resultText.includes('RELAY 1')) blocked = true;
    if (resultText.includes('RELAY 0')) blocked = false;

    sendJson(res, 200, { result: blocked, eventtime: rows[0].eventtime });
  } catch (error) {
    console.error('Erro ao consultar status do rele:', error);
    sendJson(res, 500, { error: 'Erro interno' });
  }
}

async function handleAnchorCreate(req, res, deviceId, cookieHeader) {
  const body = await readBody(req);
  try {
    const { latitude, longitude, radius, deviceName } = JSON.parse(body || '{}');

    const authorized = await checkDeviceAccess(deviceId, cookieHeader);
    if (!authorized) {
      sendJson(res, 403, { error: 'Sem permissao para criar ancora neste veiculo' });
      return;
    }

    const sessionUser = await getSessionUser(cookieHeader);
    if (!sessionUser || !sessionUser.id) {
      sendJson(res, 401, { error: 'Nao autenticado' });
      return;
    }

    if (latitude === undefined || longitude === undefined) {
      sendJson(res, 400, { error: 'Posicao do veiculo nao informada' });
      return;
    }

    const anchorRadius = radius || 100;
    const name = `ANCORA_${deviceId} - ${deviceName || 'Veiculo'}`;
    const area = `CIRCLE (${latitude} ${longitude}, ${anchorRadius})`;

    const [result] = await pool.query(
      'INSERT INTO tc_geofences (name, description, area, attributes) VALUES (?, ?, ?, ?)',
      [name, 'Ancora automatica', area, '{}'],
    );
    const geofenceId = result.insertId;

    await pool.query('INSERT INTO tc_device_geofence (deviceid, geofenceid) VALUES (?, ?)', [deviceId, geofenceId]);
    await pool.query('INSERT INTO tc_user_geofence (userid, geofenceid) VALUES (?, ?)', [sessionUser.id, geofenceId]);

    const [admins] = await pool.query('SELECT id FROM tc_users WHERE administrator = 1');
    for (const admin of admins) {
      if (admin.id !== sessionUser.id) {
        await pool.query('INSERT INTO tc_user_geofence (userid, geofenceid) VALUES (?, ?)', [admin.id, geofenceId]);
      }
    }

    sendJson(res, 200, { success: true, geofenceId });
  } catch (error) {
    console.error('Erro ao criar ancora:', error);
    sendJson(res, 500, { error: 'Erro interno ao criar ancora' });
  }
}

async function handleAnchorDelete(req, res, deviceId, cookieHeader) {
  try {
    const authorized = await checkDeviceAccess(deviceId, cookieHeader);
    if (!authorized) {
      sendJson(res, 403, { error: 'Sem permissao para remover ancora deste veiculo' });
      return;
    }

    const [geofences] = await pool.query(
      "SELECT id FROM tc_geofences WHERE name REGEXP CONCAT('^ANCORA_', ?, '($|[^0-9])')",
      [deviceId],
    );

    for (const g of geofences) {
      await pool.query('DELETE FROM tc_device_geofence WHERE geofenceid = ?', [g.id]);
      await pool.query('DELETE FROM tc_user_geofence WHERE geofenceid = ?', [g.id]);
      await pool.query('DELETE FROM tc_geofences WHERE id = ?', [g.id]);
    }

    sendJson(res, 200, { success: true, removed: geofences.length });
  } catch (error) {
    console.error('Erro ao remover ancora:', error);
    sendJson(res, 500, { error: 'Erro interno ao remover ancora' });
  }
}

const server = http.createServer(async (req, res) => {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    sendJson(res, 401, { error: 'Nao autenticado' });
    return;
  }

  const deviceEditMatch = req.url.match(/^\/api-device-edit\/(\d+)$/);
  const anchorMatch = req.url.match(/^\/api-anchor\/(\d+)$/);
  const relayStatusMatch = req.url.match(/^\/api-relay-status\/(\d+)$/);

  if (req.method === 'PUT' && deviceEditMatch) {
    await handleDeviceEdit(req, res, parseInt(deviceEditMatch[1], 10), cookieHeader);
    return;
  }

  if (req.method === 'POST' && anchorMatch) {
    await handleAnchorCreate(req, res, parseInt(anchorMatch[1], 10), cookieHeader);
    return;
  }

  if (req.method === 'DELETE' && anchorMatch) {
    await handleAnchorDelete(req, res, parseInt(anchorMatch[1], 10), cookieHeader);
    return;
  }

  if (req.method === 'GET' && relayStatusMatch) {
    await handleRelayStatus(req, res, parseInt(relayStatusMatch[1], 10), cookieHeader);
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`device-edit-proxy rodando na porta ${PORT}`);
});