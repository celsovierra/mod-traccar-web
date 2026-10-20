const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Importa a funcao de envio real da API
if (!content.includes('sendSms')) {
  content = content.replace(
    "import { getMessageStatus, getBalance } from '../smsMarket/smsMarketService';",
    "import { getMessageStatus, getBalance, sendSms } from '../smsMarket/smsMarketService';"
  );
}

// 2. Substitui a funcao de envio para usar a API do SMS Market
content = content.replace(
  /const handleSendCommand = async \(\) => \{[\s\S]*?finally \{\s*setSending\(false\);\s*\}\s*\};/,
  `const handleSendCommand = async () => {
    if (!selectedCommand) return alert('Escolha um comando primeiro!');
    if (selectedIds.length === 0) return alert('Selecione pelo menos um veiculo!');
    
    if (!window.confirm(\`Enviar SMS para \${selectedIds.length} veiculos?\`)) return;
    
    setSending(true);
    const newStatus = {};
    selectedIds.forEach(id => { newStatus[id] = 'sending'; });
    setSendStatus(prev => ({ ...prev, ...newStatus }));

    try {
      await Promise.all(selectedIds.map(async (deviceId) => {
        const device = devices[deviceId];
        const phone = device?.phone || device?.attributes?.phone; // Pega o telefone do veiculo
        
        if (!phone) {
          setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
          return;
        }

        try {
          // Aqui ele envia direto pela API do SMS Market
          const res = await sendSms({ 
            number: phone, 
            message: selectedCommand 
          });
          
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
      alert('SMS enviados para a fila da operadora. Aguardando confirmacao...');
      setSelectedIds([]);
      setSelectedCommand('');
      getBalance().then(data => setSaldo(data)); // Atualiza o saldo na tela
    } catch (e) {
      alert('Erro geral ao enviar SMS.');
    } finally {
      setSending(false);
    }
  };`
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! O envio agora usa a API do SMS Market diretamente.');
