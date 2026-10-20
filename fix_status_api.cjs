const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Troca a leitura do status para o formato correto da API
content = content.replace(
  "const statusLabel = res.statusInfo.label;",
  "const statusLabel = res.status || (res.data && res.data.status) || '';"
);

// Adiciona o tratamento para os codigos corretos da API (1 = Entregue, -1 = Enfileirada, etc)
content = content.replace(
  "if (statusLabel === 'ENTREGUE' || statusLabel === 'LIDA') {",
  "if (statusLabel === '1' || statusLabel === '2' || statusLabel === 'ENTREGUE' || statusLabel === 'LIDA') {"
);

content = content.replace(
  "} else if (statusLabel === 'FALHA' || statusLabel === 'ERRO') {",
  "} else if (statusLabel < '0' || statusLabel === 'FALHA' || statusLabel === 'ERRO') {"
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! A leitura do status agora usa a regra correta da API.');
