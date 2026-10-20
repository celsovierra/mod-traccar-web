const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');
const quebrado = `        const diffDays = lastTime`;
const consertado = `        const lastTime = pos?.fixTime || device.lastUpdate;
        const diffDays = lastTime`;
content = content.replace(quebrado, consertado);
fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! A pagina foi corrigida.');
