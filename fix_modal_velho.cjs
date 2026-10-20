const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Remove o modal de SMS antigo que ficou preso
content = content.replace(/<SmsMarketModal[\s\S]*?\/>/g, '');
content = content.replace(/import SmsMarketModal.*?;/g, '');

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! O modal velho foi removido.');
