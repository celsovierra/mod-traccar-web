const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove a linha que causou o erro
content = content.replace("const users = useSelector((state) => state.users.items);", "");

// 2. Troca a busca pelo telefone para usar a API direta (igual o Financeiro faz)
content = content.replace(
  `let phone = device?.phone || device?.attributes?.phone;
      
      if (!phone && device?.attributes?.user) {
        const owner = users[device.attributes.user];
        if (owner && owner.attributes) {
          phone = owner.attributes.fin_telefone1 || owner.attributes.phone;
        }
      }`,
  `let phone = device?.phone || device?.attributes?.phone;
      
      if (!phone && device?.attributes?.user) {
        try {
          // Puxa o usuario direto da API
          const uRes = await fetch('/api/users/' + device.attributes.user);
          if (uRes.ok) {
            const owner = await uRes.json();
            if (owner && owner.attributes) {
              phone = owner.attributes.fin_telefone1 || owner.attributes.phone;
            }
          }
        } catch (e) {}
      }`
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! O erro do Redux foi removido e a busca pela API ativada.');
