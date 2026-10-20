const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Conserta a linha que o PowerShell cortou
content = content.replace(
  "const device = devices[deviceId];\n      if (!phone) {",
  "const device = devices[deviceId];\n      const phone = device?.phone;\n      \n      if (!phone) {"
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! A linha do telefone foi restaurada.');
