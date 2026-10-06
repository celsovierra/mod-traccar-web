const http = require('http');
const { initTables } = require('./db');
const routes = require('./routes');

const PORT = process.env.PORT || 8095;

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '';
  const method = req.method || 'GET';
  try {
    if (method === 'GET' && url.startsWith('/api-telegram/status')) return routes.handleStatus(req, res, url);
    if (method === 'GET' && url.startsWith('/api-telegram/setup-webhook')) return routes.handleSetupWebhook(req, res);
    if (method === 'POST' && url === '/api-telegram/link-code') { const body = await readBody(req); return routes.handleLinkCode(req, res, body); }
    if (method === 'POST' && url === '/api-telegram/unlink') { const body = await readBody(req); return routes.handleUnlink(req, res, body); }
    if (method === 'POST' && url === '/api-telegram/test') { const body = await readBody(req); return routes.handleTest(req, res, body); }
    if (method === 'POST' && url === '/api-telegram/save-token') { const body = await readBody(req); return routes.handleSaveToken(req, res, body); }
    if (method === 'POST' && url === '/api-telegram/webhook') { const body = await readBody(req); return routes.handleWebhook(req, res, body); }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (e) {
    console.error('[server]', e);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

initTables().then(() => {
  server.listen(PORT, '127.0.0.1', () => {
    console.log('telegram-bot rodando na porta ' + PORT);
  });
}).catch((e) => {
  console.error('Erro init:', e);
  process.exit(1);
});
