const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Importa o sendSms
if (!content.includes('sendSms')) {
  content = content.replace(
    "import { getMessageStatus, getBalance } from '../smsMarket/smsMarketService';",
    "import { getMessageStatus, getBalance, sendSms } from '../smsMarket/smsMarketService';"
  );
}

// 2. Cria a nova funcao de envio
const novaFuncao = `const handleSendCommand = async () => {
    if (!selectedCommand) return alert('Escolha um comando primeiro!');
    if (selectedIds.length === 0) return alert('Selecione pelo menos um veiculo!');
    if (!window.confirm('Enviar SMS para ' + selectedIds.length + ' veiculos?')) return;
    
    setSending(true);
    const newStatus = {};
    selectedIds.forEach(id => { newStatus[id] = 'sending'; });
    setSendStatus(prev => ({ ...prev, ...newStatus }));

    await Promise.all(selectedIds.map(async (deviceId) => {
      const device = devices[deviceId];
      const phone = device?.phone;
      
      if (!phone) {
        setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
        return;
      }

      try {
        const res = await sendSms({ number: phone, message: selectedCommand });
        if (res && (res.id || res.smsMarketId)) {
            setSmsIds(prev => ({ ...prev, [deviceId]: res.id || res.smsMarketId }));
            setSendStatus(prev => ({ ...prev, [deviceId]: 'sent' }));
        } else {
            setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
        }
      } catch (e) {
        setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
      }
    }));

    setSelectedIds([]);
    setSelectedCommand('');
    setSending(false);
    getBalance().then(data => setSaldo(data));
  };`;

// Substitui a funcao antiga pela nova
const regex = /const handleSendCommand = async \(\) => \{[\s\S]*?finally \{\s*setSending\(false\);\s*\}\s*\};/;
if (regex.test(content)) {
  content = content.replace(regex, novaFuncao);
  console.log('Funcao de envio substituida.');
} else {
  console.log('Aviso: Nao encontrou a funcao antiga pelo regex. Tentando cortar pelo bloco de texto...');
  const start = content.indexOf('const handleSendCommand = async () => {');
  if (start !== -1) {
     const end = content.indexOf('const handleSelectAll', start);
     if (end !== -1) {
       content = content.substring(0, start) + novaFuncao + '\n\n  ' + content.substring(end);
       console.log('Funcao substituida por posicao.');
     }
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! O envio real foi aplicado.');
