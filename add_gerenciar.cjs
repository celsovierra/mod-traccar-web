const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Atualiza o estado para guardar a lista de comandos do banco
content = content.replace(
  "const [selectedCommand, setSelectedCommand] = useState('');",
  "const [selectedCommand, setSelectedCommand] = useState('');\n  const [commandList, setCommandList] = useState([]);"
);

// 2. Busca os comandos da API do Traccar quando a tela abrir
content = content.replace(
  "useEffect(() => {",
  `useEffect(() => {
    fetch('/api/commands', { credentials: 'same-origin' })
      .then(res => res.json())
      .then(data => setCommandList(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {`
);

// 3. Troca os <MenuItem> fixos pelos comandos salvos no banco
content = content.replace(
  `<MenuItem value="engineStop">Bloquear</MenuItem>
                <MenuItem value="engineResume">Desbloquear</MenuItem>
                <MenuItem value="deviceReboot">Reiniciar</MenuItem>
                <MenuItem value="positionSingle">Localizacao</MenuItem>`,
  `{commandList.map(cmd => (
                  <MenuItem key={cmd.id} value={cmd.type}>{cmd.description || cmd.type}</MenuItem>
                ))}`
);

// 4. Adiciona o botao "Gerenciar Comandos" ao lado do titulo
content = content.replace(
  `<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>`,
  `<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/settings/commands')} 
          sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#7c3aed', color: '#7c3aed' }}
        >
          Gerenciar Comandos
        </Button>`
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! A pagina agora puxa os comandos salvos e tem o botao de gerenciar.');
