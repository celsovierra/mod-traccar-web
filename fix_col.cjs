const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Remove a celula que mostra o ID (uniqueId) do veiculo
content = content.replace("<TableCell>{item.uniqueId}</TableCell>", "");

// Ajusta o colspan do "Nenhum veiculo..." de 3 para 2, ja que agora tem 2 colunas
content = content.replace("colSpan={3}", "colSpan={2}");

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! A coluna do IMEI foi removida.');
