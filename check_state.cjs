const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Garante que a declaracao do estado smsIds exista
if (!content.includes('const [smsIds, setSmsIds]')) {
  content = content.replace(
    "const [sendStatus, setSendStatus] = useState({});",
    "const [sendStatus, setSendStatus] = useState({});\n  const [smsIds, setSmsIds] = useState({});"
  );
}

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! O arquivo foi checado e o estado do SMS garantido.');
