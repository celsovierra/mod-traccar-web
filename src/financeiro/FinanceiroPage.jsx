import { useState } from 'react';
import { Box, Tabs, Tab, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClientesTab from './ClientesTab';
import FilaTab from './FilaTab';
import MensagensTab from './MensagensTab';
import ConexoesTab from './ConexoesTab';
import ContratoTab from './ContratoTab';

const FinanceiroPage = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button variant='outlined' startIcon={<ArrowBackIcon />} href='/' sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', borderColor: '#e2e8f0', color: '#475569' }}>Retornar para Mapa</Button>
      </Box>
      <Tabs value={tab} onChange={(e, v) => setTab(v)}>
        <Tab label="Clientes" />
        <Tab label="Fila" />
        <Tab label="Mensagens" />
        <Tab label="Conexões" />
        <Tab label="Contrato" />
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {tab === 0 && <ClientesTab />}
        {tab === 1 && <FilaTab />}
        {tab === 2 && <MensagensTab />}
        {tab === 3 && <ConexoesTab />}
        {tab === 4 && <ContratoTab />}
      </Box>
    </Box>
  );
};

export default FinanceiroPage;
