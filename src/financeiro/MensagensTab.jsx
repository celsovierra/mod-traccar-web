import { Box, Paper, Typography, Chip, Switch, IconButton, Button, Collapse, TextField, MenuItem } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EventIcon from '@mui/icons-material/Event';
import WarningIcon from '@mui/icons-material/Warning';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import fetchOrThrow from '../common/util/fetchOrThrow';

const variaveis = [
  { label: '{nome}', cor: '#f97316', bg: '#ffedd5' },
  { label: '{vencimento}', cor: '#3b82f6', bg: '#dbeafe' },
  { label: '{valor}', cor: '#3b82f6', bg: '#dbeafe' },
  { label: '{valor_atualizado}', cor: '#dc2626', bg: '#fee2e2' },
  { label: '{multa}', cor: '#d97706', bg: '#fef3c7' },
  { label: '{juros}', cor: '#d97706', bg: '#fef3c7' },
  { label: '{link_pagamento}', cor: '#7c3aed', bg: '#ede9fe' },
  { label: '{prox_vencimento}', cor: '#16a34a', bg: '#dcfce7' },
  { label: '{data_hoje}', cor: '#16a34a', bg: '#dcfce7' },
  { label: '{desconto}', cor: '#65a30d', bg: '#ecfccb' },
];

const cards = [
  { id: 1, titulo: 'Multa e Juros por Atraso', badge: null, icone: 'notif' },
  { id: 2, titulo: 'Lembrete', badge: 'Lembrete', icone: 'notif' },
  { id: 3, titulo: 'Vencimento', badge: 'Vencimento', icone: 'event' },
  { id: 4, titulo: 'Atraso', badge: 'Atraso', icone: 'warn' },
  { id: 5, titulo: 'Recibo', badge: 'Recibo', icone: 'receipt' },
];

const MensagensTab = () => {
  const [abertos, setAbertos] = useState({});
  const [ativos, setAtivos] = useState({ 1: true, 2: true, 3: true, 4: true, 5: true });
  const user = useSelector((state) => state.session.user);
  const userId = user.id;
  const userAttributes = useSelector((state) => state.session.user.attributes) || {};
  const [reciboTexto, setReciboTexto] = useState(['✅ *Pagamento Confirmado!* ✅', '', '```RECIBO DE PAGAMENTO', '=======================', 'Cliente : {nome}', 'Serviço : Rastreamento', 'Período : {vencimento}', 'Valor   : R$ {valor}', 'Multa   : {multa}', 'Juros   : {juros}', 'Desconto: {desconto}', '', 'Valor Total : {valor_atualizado}', '=======================', 'Pago em : {data_hoje}', 'Status  : ✅PAGO✅', 'Próx Venc: {prox_vencimento}', '=======================```'].join('\n'));
  const toggleAberto = (id) => setAbertos((a) => ({ ...a, [id]: !a[id] }));
  const toggleAtivo = (id) => setAtivos((a) => ({ ...a, [id]: !a[id] }));
  const iconePorTipo = (tipo) => {
    if (tipo === 'event') return <EventIcon sx={{ fontSize: 20 }} />;
    if (tipo === 'warn') return <WarningIcon sx={{ fontSize: 20 }} />;
    if (tipo === 'receipt') return <ReceiptIcon sx={{ fontSize: 20 }} />;
    return <NotificationsIcon sx={{ fontSize: 20 }} />;
  };

  const salvarTudo = async () => {
    try {
      const attrs = { ...userAttributes, fin_msg_recibo: reciboTexto };
      await fetchOrThrow('/api/users/' + userId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, name: user.name || '-', email: user.email || 'sem@local', attributes: attrs }),
      });
      alert('Salvo!')
    } catch (e) { console.error(e); alert('Erro ao salvar'); }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
      <Typography sx={{ fontSize: '0.9rem', color: '#475569', mb: 1.5 }}>Variáveis disponíveis:</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {variaveis.map((v) => (
          <Chip key={v.label} label={v.label} size='small' sx={{ backgroundColor: v.bg, color: v.cor, fontWeight: 700, fontSize: '0.75rem', borderRadius: '8px' }} />
        ))}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {cards.map((c) => (
          <Paper key={c.id} elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
              <Box sx={{ color: '#3b82f6', display: 'flex' }}>{iconePorTipo(c.icone)}</Box>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{c.titulo}</Typography>
              {c.badge && (
                <Chip label={c.badge} size='small' sx={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.7rem', height: 22 }} />
              )}
              <Chip label='Ativo' size='small' sx={{ backgroundColor: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: '0.7rem', height: 22 }} />
              <Box sx={{ flexGrow: 1 }} />
              <Switch checked={!!ativos[c.id]} onChange={() => toggleAtivo(c.id)} size='small' color='primary' />
              <IconButton size='small' onClick={() => toggleAberto(c.id)}>
                {abertos[c.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Collapse in={!!abertos[c.id]}>
              {c.id === 1 ? (
                <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: '1px solid #f1f5f9' }}>
                  <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 2 }}>
                    Valores aplicados automaticamente em cobranças atrasadas.
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1 }}>Multa por atraso</Typography>
                      <TextField select fullWidth size='small' defaultValue='fixo' sx={{ mb: 1.5 }}>
                        <MenuItem value='fixo'>Valor fixo (R$)</MenuItem>
                      </TextField>
                      <TextField fullWidth size='small' defaultValue='1' />
                      <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.5 }}>Valor fixo em reais cobrado por atraso. Ex: R$ 5,00</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1 }}>Juros por atraso</Typography>
                      <TextField select fullWidth size='small' defaultValue='fixo' sx={{ mb: 1.5 }}>
                        <MenuItem value='fixo'>Valor fixo por dia (R$)</MenuItem>
                      </TextField>
                      <TextField fullWidth size='small' defaultValue='0,10' />
                      <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.5 }}>Valor fixo em reais cobrado por dia de atraso. Ex: R$ 1,00/dia</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ mt: 3, p: 2, backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem', mb: 1 }}>Simulação (R$ 100,00 com 10 dias de atraso)</Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: '#475569', mb: 0.5 }}>Valor: R$ 100,00</Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: '#475569', mb: 0.5 }}>Multa (R$ 1,00): + R$ 1,00</Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: '#475569', mb: 0.5 }}>Juros (R$ 0,10/dia x 10d): + R$ 1,00</Typography>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', pt: 1, borderTop: '1px solid #cbd5e1' }}>Total: R$ 102,00</Typography>
                  </Box>
                </Box>
              ) : c.id === 5 ? (
                <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: '1px solid #f1f5f9' }}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1 }}>Conteúdo da mensagem</Typography>
                  <TextField fullWidth multiline minRows={12} value={reciboTexto} onChange={(e) => setReciboTexto(e.target.value)} sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.82rem' } }} />
                </Box>
              ) : null}
            </Collapse>
          </Paper>
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button variant='contained' onClick={salvarTudo} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', backgroundColor: '#2563eb' }}>
          Salvar Tudo
        </Button>
      </Box>
    </Box>
  );
};

export default MensagensTab;
