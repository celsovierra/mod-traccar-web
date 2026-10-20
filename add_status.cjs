const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Adiciona o estado para guardar o status de envio de cada veiculo
content = content.replace(
  "const [sending, setSending] = useState(false);",
  `const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState({}); // { [deviceId]: 'sending' | 'success' | 'error' }`
);

// 2. Substitui a funcao handleSendCommand para atualizar o status
content = content.replace(
  /const handleSendCommand = async \(\) => \{[\s\S]*?\};/,
  `const handleSendCommand = async () => {
    if (!selectedCommand) return alert('Escolha um comando primeiro!');
    if (selectedIds.length === 0) return alert('Selecione pelo menos um veiculo!');
    
    if (!window.confirm(\`Enviar comando para \${selectedIds.length} veiculos?\`)) return;
    
    setSending(true);
    const newStatus = {};
    selectedIds.forEach(id => { newStatus[id] = 'sending'; });
    setSendStatus(prev => ({ ...prev, ...newStatus }));

    try {
      await Promise.all(selectedIds.map(async (deviceId) => {
        try {
          const res = await fetch('/api/commands/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, type: selectedCommand })
          });
          
          if (res.ok) {
            setSendStatus(prev => ({ ...prev, [deviceId]: 'success' }));
          } else {
            setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
          }
        } catch (e) {
          setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
        }
      }));
      alert('Processo de envio finalizado!');
      setSelectedIds([]);
      setSelectedCommand('');
    } catch (e) {
      alert('Erro geral ao enviar comandos.');
    } finally {
      setSending(false);
    }
  };`
);

// 3. Adiciona a coluna de Status na Tabela (Cabecalho)
content = content.replace(
  `<TableCell sx={{ fontWeight: 700 }}>Status</TableCell>`,
  `<TableCell sx={{ fontWeight: 700 }}>Status Offline</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Envio SMS</TableCell>`
);

// 4. Adiciona a coluna de Status na Tabela (Linha)
content = content.replace(
  `<TableCell sx={{ color: '#ef4444', fontWeight: 700 }}>
                Offline há {item.diasOffline} dia(s)
              </TableCell>`,
  `<TableCell sx={{ color: '#ef4444', fontWeight: 700 }}>
                Offline há {item.diasOffline} dia(s)
              </TableCell>
              <TableCell>
                {sendStatus[item.id] === 'sending' && <span style={{ color: '#d97706', fontWeight: 'bold' }}>Enviando...</span>}
                {sendStatus[item.id] === 'success' && <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Enviado (OK)</span>}
                {sendStatus[item.id] === 'error' && <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Falha</span>}
                {!sendStatus[item.id] && <span style={{ color: '#9ca3af' }}>-</span>}
              </TableCell>`
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! A coluna de status de envio foi adicionada.');
