const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Importa a funcao real do SMS Market
if (!content.includes('smsMarketService')) {
  content = content.replace(
    "import { useState, useEffect } from 'react';",
    "import { useState, useEffect } from 'react';\nimport { getMessageStatus } from '../smsMarket/smsMarketService';"
  );
}

// 2. Adiciona o estado para guardar os IDs dos SMS enviados
content = content.replace(
  "const [sendStatus, setSendStatus] = useState({});",
  `const [sendStatus, setSendStatus] = useState({});
  const [smsIds, setSmsIds] = useState({});`
);

// 3. Adiciona o loop de verificacao real (a cada 10 segundos)
content = content.replace(
  "const handleSelectAll = (event) => {",
  `useEffect(() => {
    const interval = setInterval(async () => {
      const idsToCheck = Object.keys(smsIds);
      if (idsToCheck.length === 0) return;

      for (const deviceId of idsToCheck) {
        const smsId = smsIds[deviceId];
        if (!smsId) continue;
        
        try {
          const res = await getMessageStatus({ id: smsId });
          if (res && res.statusInfo) {
            const statusLabel = res.statusInfo.label; // Retorna 'ENTREGUE', 'FALHA', etc.
            
            if (statusLabel === 'ENTREGUE') {
              setSendStatus(prev => ({ ...prev, [deviceId]: 'success' }));
              setSmsIds(prev => { const n = {...prev}; delete n[deviceId]; return n; });
            } else if (statusLabel === 'FALHA' || statusLabel === 'ERRO') {
              setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
              setSmsIds(prev => { const n = {...prev}; delete n[deviceId]; return n; });
            }
          }
        } catch (e) {
          console.error('Erro ao checar SMS', e);
        }
      }
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [smsIds]);

  const handleSelectAll = (event) => {`
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! A verificacao real do SMS Market foi integrada.');
