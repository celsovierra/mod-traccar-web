import { useState } from 'react';
import { Box, Tabs, Tab, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClientesTab from './ClientesTab';
import FilaTab from './FilaTab';
import MensagensTab from './MensagensTab';
import ConexoesTab from './ConexoesTab';
import ContratosTab from './ContratosTab';
import DashboardTab from './DashboardTab';

const FinanceiroPage = () => {
  const [tab, setTab] = useState(0);
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 1 }}>
        <Button variant='contained' onClick={() => setShowDashboard(true)} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', backgroundColor: '#7c3aed', display: showDashboard ? 'none' : 'inline-flex' }}>Dashboard</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant='outlined' startIcon={<ArrowBackIcon />} href='/' sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', borderColor: '#e2e8f0', color: '#475569' }}>Retornar para Mapa</Button>
      </Box>
      <Tabs value={tab} sx={{ display: showDashboard ? 'none' : 'flex' }} onChange={(e, v) => setTab(v)}>
        <Tab label="Clientes" />
        <Tab label="Fila" />
        <Tab label="Mensagens" />
        <Tab label="Conexões" />
        <Tab label="Contrato" />
      </Tabs>

      {showDashboard && <DashboardTab onClose={() => setShowDashboard(false)} />}

      <Box sx={{ mt: 2, display: showDashboard ? 'none' : 'block' }}>
        {tab === 0 && <ClientesTab />}
        {tab === 1 && <FilaTab />}
        {tab === 2 && <MensagensTab />}
        {tab === 3 && <ConexoesTab />}
        {tab === 4 && <ContratosTab />}
      </Box>
    </Box>
  );
};

export default FinanceiroPage;
