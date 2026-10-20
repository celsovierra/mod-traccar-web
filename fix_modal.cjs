const fs = require('fs');
const file = 'C:/mod-traccar-web/src/smsMarket/SmsMarketModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// Procura o Dialog e adiciona propriedades para centralizar e aumentar
content = content.replace(
  /<Dialog\s+open=\{open\}/,
  `<Dialog
      open={open}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: '24px',
          background: '#f8fafc',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }
      }}`
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! O modal foi centralizado e redimensionado.');
