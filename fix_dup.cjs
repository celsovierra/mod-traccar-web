const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Remove a declaracao duplicada de lastTime
content = content.replace(
  "const lastTime = pos?.fixTime || device.lastUpdate;\n        const lastTime = pos?.fixTime || device.lastUpdate;",
  "const lastTime = pos?.fixTime || device.lastUpdate;"
);

// Se ainda houver duplicata, remove a segunda ocorrencia
const count = (content.match(/const lastTime =/g) || []).length;
if (count > 1) {
  let first = content.indexOf('const lastTime =');
  let second = content.indexOf('const lastTime =', first + 1);
  if (second !== -1) {
    content = content.slice(0, second) + content.slice(second + 'const lastTime = pos?.fixTime || device.lastUpdate;'.length);
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! A duplicata foi removida.');
