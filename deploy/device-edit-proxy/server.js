const express = require('express');
const app = express();
app.use(express.json());
app.post('/api-anchor/:id', (req, res) => res.json({ ok: true, msg: 'rota ok' }));
app.post('/api-device-event/:id', (req, res) => res.json({ ok: true }));
app.listen(8090, () => console.log('Proxy na 8090'));
