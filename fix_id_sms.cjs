const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Corrige a leitura do ID da resposta da API
content = content.replace(
  "if (res && (res.id || res.smsMarketId)) {\n            setSmsIds(prev => ({ ...prev, [deviceId]: res.id || res.smsMarketId }));",
  "const msgId = res?.id || res?.smsMarketId || res?.responseCode;\n        if (msgId && msgId !== '000') {\n            setSmsIds(prev => ({ ...prev, [deviceId]: msgId }));"
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! A leitura do ID do SMS foi corrigida.');
