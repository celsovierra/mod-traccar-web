const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Procura o titulo e injeta o bloco do saldo logo ao lado
const target = `<Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
          Manutenção de Veículos (Filtro: Offline)
        </Typography>`;

const novo = `<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
            Manutenção de Veículos (Filtro: Offline)
          </Typography>
          <Box sx={{ 
            backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', 
            borderRadius: '8px', px: 2, py: 0.5, color: '#1d4ed8', 
            fontWeight: 700, fontSize: '0.9rem' 
          }}>
            SMS: {saldo}
          </Box>
        </Box>`;

if (content.includes(target)) {
  content = content.replace(target, novo);
  fs.writeFileSync(file, content, 'utf8');
  console.log('SUCESSO! O visor de saldo foi forçado na tela.');
} else {
  console.log('ERRO: Nao encontrou o titulo. Tentando versao menor...');
  // Caso o titulo tenha quebrado de linha diferente
  const fallback = content.indexOf('Manutenção de Veículos');
  if (fallback !== -1) {
    console.log('O titulo existe mas a formatacao esta diferente.');
  }
}
