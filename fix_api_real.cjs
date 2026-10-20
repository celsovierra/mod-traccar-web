const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Adiciona a importacao da funcao de normalizar telefone (se existir no projeto)
// Se a normalizeBrazilPhone for local, nos copiamos a logica basica dela aqui:
if (!content.includes('normalizeBrazilPhone')) {
  content = content.replace(
    "import { getMessageStatus, getBalance, sendSms } from '../smsMarket/smsMarketService';",
    "import { getMessageStatus, getBalance, sendSms } from '../smsMarket/smsMarketService';\n\nconst normalizeBrazilPhone = (phone) => {\n  if (!phone) return '';\n  let digits = String(phone).replace(/\\D/g, '');\n  if (digits.length === 11 || digits.length === 10) return '55' + digits;\n  return digits;\n};"
  );
}

// 2. Substitui a chamada do sendSms dentro da funcao handleSendCommand
content = content.replace(
  "const res = await sendSms({ number: phone, message: selectedCommand });",
  "const normalizedPhone = normalizeBrazilPhone(phone);\n        const res = await sendSms(normalizedPhone, selectedCommand);"
);

// 3. Remove os alerts de erro para ficar limpo igual o original
content = content.replace(
  "} catch (e) {\n        alert('Erro no envio: ' + e.message);\n        setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));\n      }",
  "} catch (e) {\n        setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));\n      }"
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! O envio agora usa a formatação correta do seu sistema.');
