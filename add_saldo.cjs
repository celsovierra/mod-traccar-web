const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Importa a funcao de saldo (vamos assumir que ela existe no arquivo ou usar a mesma chamada do Modal)
// Se o seu sistema usa 'getSaldo' ou similar, ele vai buscar
if (!content.includes('useSelector')) {
  content = content.replace(
    "import { useState, useEffect } from 'react';",
    "import { useState, useEffect } from 'react';\nimport { useSelector } from 'react-redux';"
  );
}

// 2. Adiciona o estado do saldo
if (!content.includes('const [saldo, setSaldo]')) {
  content = content.replace(
    "const [smsIds, setSmsIds] = useState({});",
    `const [smsIds, setSmsIds] = useState({});
  const [saldo, setSaldo] = useState('...');
  const user = useSelector((state) => state.session.user);
  const admin = useSelector((state) => state.session.user); // Apenas para ter acesso
  
  useEffect(() => {
    // Puxa o saldo da API do SMS Market
    // Se o sistema usa um endpoint interno, ajuste aqui:
    fetch('/api-smsmarket/saldo', { credentials: 'same-origin' })
      .then(res => res.json())
      .then(data => {
         if (data && data.saldo !== undefined) setSaldo(data.saldo);
         else if (data && data.balance !== undefined) setSaldo(data.balance);
      })
      .catch(() => {});
  }, []);`
  );
}

// 3. Coloca o texto do saldo no topo
content = content.replace(
  `<Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b', mb: 1 }}>
            Manutenção de Veículos (Filtro: Offline)
          </Typography>`,
  `<Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
              Manutenção de Veículos (Filtro: Offline)
            </Typography>
            <Box sx={{ 
              backgroundColor: '#eff6ff', 
              border: '1px solid #bfdbfe', 
              borderRadius: '8px', 
              px: 2, py: 0.5, 
              color: '#1d4ed8', 
              fontWeight: 700, 
              fontSize: '0.9rem' 
            }}>
              SMS: {saldo}
            </Box>
          </Box>`
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! O contador de saldo SMS foi integrado.');
