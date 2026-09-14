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

async function checkDeviceAccess(deviceId, cookieHeader) {
  const response = await fetch(`${TRACCAR_URL}/api/devices/${deviceId}`, {
    method: 'GET',
    headers: { Cookie: cookieHeader || '' },
  });
  return response.ok;
}

const server = http.createServer(async (req, res) => {
  const urlMatch = req.url.match(/^\/api-device-edit\/(\d+)$/);

  if (req.method !== 'PUT' || !urlMatch) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  const deviceId = parseInt(urlMatch[1], 10);
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    sendJson(res, 401, { error: 'Nao autenticado' });
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    try {
      const { model, plate } = JSON.parse(body || '{}');

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
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`device-edit-proxy rodando na porta ${PORT}`);
});
