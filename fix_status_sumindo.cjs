const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const novaConsulta = `try {
          const res = await getMessageStatus({ id: smsId });
          
          if (res) {
            const statusLabel = String(res.status || (res.data && res.data.status) || '');
            
            if (statusLabel === '1' || statusLabel === '2') {
              setSendStatus(prev => ({ ...prev, [deviceId]: 'success' }));
              setSmsIds(prev => { const n = {...prev}; delete n[deviceId]; return n; });
            } else if (statusLabel.startsWith('-') || statusLabel === '8' || statusLabel === '9') {
              setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
              setSmsIds(prev => { const n = {...prev}; delete n[deviceId]; return n; });
            }
          }
        } catch (e) {}`;

const regexConsulta = /try \{\s*const res = await getMessageStatus\(\{ id: smsId \}\);[\s\S]*?\} catch \(e\) \{\}/;
if (regexConsulta.test(content)) {
  content = content.replace(regexConsulta, novaConsulta);
  console.log('Consulta atualizada!');
}

const regexEnvio = /if \(messageId\) \{[\s\S]*?setSendStatus\(prev => \(\{ \.\.\.prev, \[deviceId\]: 'error' \}\)\);\s*\}/;
const novoEnvio = `if (messageId) {
            setSmsIds(prev => ({ ...prev, [deviceId]: messageId }));
            setSendStatus(prev => ({ ...prev, [deviceId]: 'sent' }));
        } else if (res && res.responseCode === '000') {
            setSendStatus(prev => ({ ...prev, [deviceId]: 'sent' }));
        } else {
            setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
        }`;

if (regexEnvio.test(content)) {
  content = content.replace(regexEnvio, novoEnvio);
  console.log('Envio atualizado!');
}

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! O status nao vai mais sumir.');
