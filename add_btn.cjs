const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Adiciona os imports necessarios se nao existirem
if (!content.includes('useNavigate')) {
  content = content.replace(
    "import { useSelector } from 'react-redux';",
    "import { useSelector } from 'react-redux';\nimport { useNavigate } from 'react-router-dom';\nimport { Button } from '@mui/material';\nimport ArrowBackIcon from '@mui/icons-material/ArrowBack';"
  );
}

// 2. Adiciona o hook useNavigate dentro do componente
if (!content.includes('const navigate = useNavigate();')) {
  content = content.replace(
    "const [lista, setLista] = useState([]);",
    "const navigate = useNavigate();\n  const [lista, setLista] = useState([]);"
  );
}

// 3. Adiciona o botao visual acima do titulo
const headerTarget = `<Typography variant="h5" sx={{ fontWeight: 800, mb: 3, color: '#1e293b' }}>
        Manutenção de Veículos (Filtro: Offline)
      </Typography>`;

const headerNovo = `<Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/')} 
        sx={{ mb: 2, textTransform: 'none', fontWeight: 600, color: '#7c3aed' }}
      >
        Voltar para o Mapa
      </Button>
      
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, color: '#1e293b' }}>
        Manutenção de Veículos (Filtro: Offline)
      </Typography>`;

if (content.includes(headerTarget)) {
  content = content.replace(headerTarget, headerNovo);
  fs.writeFileSync(file, content, 'utf8');
  console.log('SUCESSO! O botao de voltar foi adicionado.');
} else {
  console.log('ERRO: Nao encontrou o titulo para colocar o botao.');
}
