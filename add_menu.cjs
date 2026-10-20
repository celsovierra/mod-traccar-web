const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/components/SettingsMenu.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `            <MenuItem
              title="Financeiro"
              link="/settings/financeiro"
              icon={<PaymentIcon fontSize="small" />}
              selected={location.pathname.startsWith('/settings/financeiro')}
            />`;

const novo = `            <MenuItem
              title="Financeiro"
              link="/settings/financeiro"
              icon={<PaymentIcon fontSize="small" />}
              selected={location.pathname.startsWith('/settings/financeiro')}
            />
            <MenuItem
              title="Manutencao de Veiculos"
              link="/settings/manutencao"
              icon={<ConstructionIcon fontSize="small" />}
              selected={location.pathname.startsWith('/settings/manutencao')}
            />`;

if (content.includes(target)) {
  content = content.replace(target, novo);
  fs.writeFileSync(file, content, 'utf8');
  console.log('SUCESSO! O botao Manutencao de Veiculos foi adicionado.');
} else {
  console.log('ERRO: Nao encontrou o bloco do Financeiro.');
}
