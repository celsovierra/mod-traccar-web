const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Substitui a função de envio e a de consulta de status
const novaFuncaoEnvio = `const handleSendCommand = async () => {
    if (!selectedCommand) return alert('Escolha um comando primeiro!');
    if (selectedIds.length === 0) return alert('Selecione pelo menos um veiculo!');
    if (!window.confirm('Enviar SMS para ' + selectedIds.length + ' veiculos?')) return;
    
    setSending(true);
    const newStatus = {};
    selectedIds.forEach(id => { newStatus[id] = 'sending'; });
    setSendStatus(prev => ({ ...prev, ...newStatus }));

    await Promise.all(selectedIds.map(async (deviceId) => {
      const device = devices[deviceId];
      let phone = device?.phone || device?.attributes?.phone;
      
      if (!phone && device?.attributes?.user) {
        try {
          const uRes = await fetch('/api/users/' + device.attributes.user);
          if (uRes.ok) {
            const owner = await uRes.json();
            if (owner && owner.attributes) {
              phone = owner.attributes.fin_telefone1 || owner.attributes.phone;
            }
          }
        } catch (e) {}
      }

      if (!phone) {
        setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
        return;
      }

      try {
        const normalizedPhone = normalizeBrazilPhone(phone);
        const res = await sendSms(normalizedPhone, selectedCommand);
        
        if (res && (res.id || res.responseCode === '000')) {
            if (res.id) setSmsIds(prev => ({ ...prev, [deviceId]: res.id }));
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

const regexEnvio = /const handleSendCommand = async \(\) => \{[\s\S]*?finally \{\s*setSending\(false\);\s*\}\s*\};/;
if (regexEnvio.test(content)) {
  content = content.replace(regexEnvio, novaFuncaoEnvio);
}

const regexConsulta = /const res = await getMessageStatus\(\{ id: smsId \}\);[\s\S]*?\} catch \(e\) \{\}/;
const novaConsulta = `const res = await getMessageStatus({ id: smsId });
          if (res && res.statusInfo) {
            const statusLabel = res.statusInfo.label;
            if (statusLabel === 'ENTREGUE') {
              setSendStatus(prev => ({ ...prev, [deviceId]: 'success' }));
              setSmsIds(prev => { const n = {...prev}; delete n[deviceId]; return n; });
            } else if (statusLabel === 'FALHA' || statusLabel === 'ERRO') {
              setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
              setSmsIds(prev => { const n = {...prev}; delete n[deviceId]; return n; });
            }
          }
        } catch (e) {}`;
        
if (regexConsulta.test(content)) {
  content = content.replace(regexConsulta, novaConsulta);
}

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! Código ajustado conforme a documentação real.');
