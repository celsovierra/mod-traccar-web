const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Atualiza os imports
content = content.replace(
  "import { Box, Typography, Table, TableHead, TableBody, TableRow, TableCell, Checkbox, Button } from '@mui/material';",
  "import { Box, Typography, Table, TableHead, TableBody, TableRow, TableCell, Checkbox, Button, MenuItem, Select, FormControl, InputLabel } from '@mui/material';"
);

// Adiciona estado para o comando
content = content.replace(
  "const [smsModalOpen, setSmsModalOpen] = useState(false);",
  `const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState('');
  const [sending, setSending] = useState(false);
  
  const handleSendCommand = async () => {
    if (!selectedCommand) return alert('Escolha um comando primeiro!');
    if (selectedIds.length === 0) return alert('Selecione pelo menos um veiculo!');
    
    if (!window.confirm('Enviar comando para ' + selectedIds.length + ' veiculos?')) return;
    
    setSending(true);
    try {
      await Promise.all(selectedIds.map(deviceId => 
        fetch('/api/commands/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId, type: selectedCommand })
        })
      ));
      alert('Comandos enviados com sucesso!');
      setSelectedIds([]);
    } catch (e) {
      alert('Erro ao enviar comandos.');
    } finally {
      setSending(false);
    }
  };`
);

// Adiciona o campo de selecao e o botao de enviar no topo
content = content.replace(
  `{selectedIds.length > 0 && (
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => setSmsModalOpen(true)}
            sx={{ backgroundColor: '#3b82f6', textTransform: 'none', fontWeight: 700 }}
          >
            Enviar SMS ({selectedIds.length})
          </Button>
        )}`,
  `{selectedIds.length > 0 && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Comando</InputLabel>
              <Select
                value={selectedCommand}
                onChange={(e) => setSelectedCommand(e.target.value)}
                label="Comando"
              >
                <MenuItem value="engineStop">Bloquear</MenuItem>
                <MenuItem value="engineResume">Desbloquear</MenuItem>
                <MenuItem value="deviceReboot">Reiniciar</MenuItem>
                <MenuItem value="positionSingle">Localizacao</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSendCommand}
              disabled={sending || !selectedCommand}
              sx={{ backgroundColor: '#3b82f6', textTransform: 'none', fontWeight: 700 }}
            >
              {sending ? 'Enviando...' : 'Enviar'}
            </Button>
          </Box>
        )}`
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! Os botoes de comando em massa foram adicionados.');
