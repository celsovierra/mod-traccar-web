const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Atualiza a linha de import do @mui/material para incluir o FormControl e outros
content = content.replace(
  /import {([^}]*)} from '@mui\/material';/,
  (match, p1) => {
    let imports = p1.split(',').map(s => s.trim());
    const required = ['FormControl', 'InputLabel', 'Select', 'MenuItem'];
    required.forEach(req => {
      if (!imports.includes(req)) imports.push(req);
    });
    return `import { ${imports.join(', ')} } from '@mui/material';`;
  }
);

// 2. Garante que o SendIcon esta importado
if (!content.includes('SendIcon')) {
  content = content.replace(
    /import ArrowBackIcon.*?;/,
    "import ArrowBackIcon from '@mui/icons-material/ArrowBack';\nimport SendIcon from '@mui/icons-material/Send';"
  );
}

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! Os imports do FormControl foram restaurados.');
