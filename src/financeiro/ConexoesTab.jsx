import { Box, Paper, Typography, Chip, IconButton, Collapse, TextField, MenuItem, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WifiIcon from '@mui/icons-material/Wifi';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import QrCodeIcon from '@mui/icons-material/QrCode';
import LogoutIcon from '@mui/icons-material/Logout';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useState } from 'react';

const cards = [
  { id: 1, titulo: 'WhatsApp (Evolution API)', badge: 'Conectado', icone: 'wifi' },
  { id: 2, titulo: 'Gateway de Pagamento', badge: 'Ativa', icone: 'card' },
];

const ConexoesTab = () => {
  const [abertos, setAbertos] = useState({});
  const toggleAberto = (id) => setAbertos((a) => ({ ...a, [id]: !a[id] }));
  const iconePorTipo = (tipo) => {
    if (tipo === 'card') return <CreditCardIcon sx={{ fontSize: 20 }} />;
    return <WifiIcon sx={{ fontSize: 20 }} />;
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {cards.map((c) => (
          <Paper key={c.id} elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
              <Box sx={{ color: '#3b82f6', display: 'flex' }}>{iconePorTipo(c.icone)}</Box>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{c.titulo}</Typography>
              <Chip label={c.badge} size='small' sx={{ backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 700, fontSize: '0.7rem', height: 22 }} />
              <Box sx={{ flexGrow: 1 }} />
              <IconButton size='small' onClick={() => toggleAberto(c.id)}>
                {abertos[c.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Collapse in={!!abertos[c.id]}>
              {c.id === 2 ? (
                <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: '1px solid #f1f5f9' }}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1 }}>Gateway Ativo para Cobranças</Typography>
                  <TextField select fullWidth size='small' defaultValue='mp' sx={{ mb: 3 }}>
                    <MenuItem value='mp'>Mercado Pago</MenuItem>
                    <MenuItem value='asaas'>Asaas</MenuItem>
                  </TextField>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1 }}>Access Token Mercado Pago</Typography>
                  <TextField fullWidth size='small' type='password' defaultValue='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' sx={{ mb: 3 }} />
                  <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1.5 }}>URL do Webhook</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField fullWidth size='small' defaultValue='https://gpscell.gpscell.site/api/webhook/mercadopago' InputProps={{ readOnly: true }} />
                      <IconButton size='small' sx={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <ContentCopyIcon fontSize='small' />
                      </IconButton>
                    </Box>
                    <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 1 }}>Cole esta URL nas configurações de webhook do Mercado Pago.</Typography>
                  </Box>
                </Box>
              ) : c.id === 1 ? (
                <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: '1px solid #f1f5f9' }}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1 }}>URL da API</Typography>
                  <TextField fullWidth size='small' defaultValue='https://evolution.gpscell.site' sx={{ mb: 2.5 }} />
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1 }}>API Key</Typography>
                  <TextField fullWidth size='small' type='password' defaultValue='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' sx={{ mb: 2.5 }} />
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1 }}>Nome da Instância</Typography>
                  <TextField fullWidth size='small' defaultValue='localhost_cobrancapro' sx={{ mb: 2.5 }} />
                  <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5 }}>
                    <Button variant='contained' startIcon={<SaveIcon />} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', backgroundColor: '#2563eb' }}>Salvar</Button>
                    <Button variant='outlined' startIcon={<QrCodeIcon />} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', color: '#475569', borderColor: '#e2e8f0' }}>Gerar QR Code</Button>
                  </Box>
                  <Box sx={{ p: 2, backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <WifiIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#16a34a', flexGrow: 1 }}>WhatsApp conectado!</Typography>
                    <Button variant='contained' startIcon={<LogoutIcon />} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' } }}>Desconectar</Button>
                  </Box>
                </Box>
              ) : null}
            </Collapse>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default ConexoesTab;
