const fs = require('fs');
const file = 'C:/mod-traccar-web/src/common/components/StatusCard.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');
if (lines[1233] && lines[1233].trim() === '};') {
  lines.splice(1233, 1);
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log('SUCESSO! Linha 1234 removida.');
} else {
  console.log('ERRO: A linha 1234 nao tem o padrao esperado.');
}
