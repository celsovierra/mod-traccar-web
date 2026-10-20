const fs = require('fs');
const file = 'C:/mod-traccar-web/src/Navigation.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Adicionar o import (se nao existir)
if (!content.includes('ManutencaoPage')) {
  content = content.replace(
    "const FinanceiroPage = lazy(() => import('./financeiro/FinanceiroPage'));",
    "const FinanceiroPage = lazy(() => import('./financeiro/FinanceiroPage'));\nconst ManutencaoPage = lazy(() => import('./settings/ManutencaoPage'));"
  );
}

// 2. Adicionar a rota (se nao existir)
if (!content.includes('path="manutencao"')) {
  content = content.replace(
    '<Route path="financeiro" element={<FinanceiroPage />} />',
    '<Route path="financeiro" element={<FinanceiroPage />} />\n            <Route path="manutencao" element={<ManutencaoPage />} />'
  );
}

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! A rota de Manutencao foi criada.');
