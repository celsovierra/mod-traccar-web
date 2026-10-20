const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Garante que o import do getBalance esta correto
if (!content.includes('getBalance')) {
  content = content.replace(
    "import { getMessageStatus } from '../smsMarket/smsMarketService';",
    "import { getMessageStatus, getBalance } from '../smsMarket/smsMarketService';"
  );
}

// 2. Remove o fetch errado e coloca a chamada real do getBalance
content = content.replace(
  `useEffect(() => {
    // Puxa o saldo da API do SMS Market
    // Se o sistema usa um endpoint interno, ajuste aqui:
    fetch('/api-smsmarket/saldo', { credentials: 'same-origin' })
      .then(res => res.json())
      .then(data => {
         if (data && data.saldo !== undefined) setSaldo(data.saldo);
         else if (data && data.balance !== undefined) setSaldo(data.balance);
      })
      .catch(() => {});
  }, []);`,
  `useEffect(() => {
    getBalance()
      .then(data => { if (data !== null && data !== undefined) setSaldo(data); })
      .catch(() => setSaldo('Erro'));
  }, []);`
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! O saldo real da API foi integrado.');
