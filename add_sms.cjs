const fs = require('fs');
const file = 'C:/mod-traccar-web/src/settings/ManutencaoPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Atualiza os Imports
content = content.replace(
  "import { Button } from '@mui/material';",
  "import { Button, Checkbox } from '@mui/material';\nimport SendIcon from '@mui/icons-material/Send';\nimport SmsMarketModal from '../smsMarket/SmsMarketModal';"
);

// 2. Adiciona os estados de selecao no componente
content = content.replace(
  "const [lista, setLista] = useState([]);",
  `const [lista, setLista] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [smsModalOpen, setSmsModalOpen] = useState(false);

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedIds(lista.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };`
);

// 3. Adiciona o Botao de Enviar SMS ao lado do titulo
content = content.replace(
  `      <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, color: '#1e293b' }}>
        Manutenção de Veículos (Filtro: Offline)
      </Typography>`,
  `      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
          Manutenção de Veículos (Filtro: Offline)
        </Typography>
        {selectedIds.length > 0 && (
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => setSmsModalOpen(true)}
            sx={{ backgroundColor: '#3b82f6', textTransform: 'none', fontWeight: 700 }}
          >
            Enviar SMS ({selectedIds.length})
          </Button>
        )}
      </Box>`
);

// 4. Adiciona a Coluna de Checkbox e o Checkbox em cada linha
content = content.replace(
  `<TableRow key={item.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9fafb' } }}>
              <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
              
              <TableCell sx={{ color: '#ef4444', fontWeight: 700 }}>
                Offline há {item.diasOffline} dia(s)
              </TableCell>
            </TableRow>`,
  `<TableRow key={item.id} selected={selectedIds.includes(item.id)} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9fafb' } }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedIds.includes(item.id)}
                  onChange={() => handleSelect(item.id)}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
              
              <TableCell sx={{ color: '#ef4444', fontWeight: 700 }}>
                Offline há {item.diasOffline} dia(s)
              </TableCell>
            </TableRow>`
);

// 5. Adiciona o Cabecalho da Tabela (opcional, mas fica bonito)
content = content.replace(
  `<Table>
        <TableBody>`,
  `<Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={selectedIds.length > 0 && selectedIds.length < lista.length}
                checked={lista.length > 0 && selectedIds.length === lista.length}
                onChange={handleSelectAll}
              />
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Veículo</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>`
);

// 6. Adiciona o componente SmsMarketModal no final da tela
content = content.replace(
  `    </Box>
  );
};`,
  `    <SmsMarketModal
        open={smsModalOpen}
        onClose={() => setSmsModalOpen(false)}
        selectedDevices={selectedIds}
      />
    </Box>
  );
};`
);

// 7. Atualiza os imports do MUI para incluir TableHead
content = content.replace(
  "import { Box, Typography, Table, TableBody, TableRow, TableCell } from '@mui/material';",
  "import { Box, Typography, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';"
);

fs.writeFileSync(file, content, 'utf8');
console.log('SUCESSO! A pagina agora tem selecao de veiculos e botao de SMS.');
