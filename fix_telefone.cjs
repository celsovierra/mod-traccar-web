const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Importa os usuarios da Store do Redux
if (!content.includes('const users = useSelector')) {
  content = content.replace(
    "const positions = useSelector((state) => state.session.positions);",
    "const positions = useSelector((state) => state.session.positions);\n  const users = useSelector((state) => state.users.items);"
  );
}

// 2. Troca a linha que puxa o telefone para buscar no cadastro do usuario dono do veiculo
content = content.replace(
  "const phone = device?.phone;",
  `let phone = device?.phone || device?.attributes?.phone;
      
      // Se nao tiver no veiculo, procura no usuario dono (igual o Financeiro faz)
      if (!phone && device?.attributes?.user) {
        const owner = users[device.attributes.user];
        if (owner && owner.attributes) {
          phone = owner.attributes.fin_telefone1 || owner.attributes.phone;
        }
      }`
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! A busca pelo telefone do cliente foi adicionada.');
