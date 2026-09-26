import { Box, Paper, Typography, Chip, IconButton, Collapse, TextField, MenuItem, Button, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WifiIcon from '@mui/icons-material/Wifi';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import SaveIcon from '@mui/icons-material/Save';
import QrCodeIcon from '@mui/icons-material/QrCode';
import LogoutIcon from '@mui/icons-material/Logout';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import fetchOrThrow from '../common/util/fetchOrThrow';

const cards = [
  { id: 1, titulo: 'WhatsApp (Evolution API)', icone: 'wifi' },
  { id: 2, titulo: 'Gateway de Pagamento', icone: 'card' },
];

const ConexoesTab = () => {
  const [abertos, setAbertos] = useState({});
  const [evoUrl, setEvoUrl] = useState('https://evolution.gpscell.site');
  const [evoKey, setEvoKey] = useState('');
  const [evoInst, setEvoInst] = useState('');
  const [evoStatus, setEvoStatus] = useState('desconhecido');
  const [carregando, setCarregando] = useState(false);
  const [gwAtivo, setGwAtivo] = useState('mercadopago');
  const [gwToken, setGwToken] = useState('');
  const [gwUrlWebhook, setGwUrlWebhook] = useState('');
  const userId = useSelector((state) => state.session.user.id);
  const userAttributes = useSelector((state) => state.session.user.attributes) || {};

  useEffect(() => {
    setEvoUrl(userAttributes.fin_evo_url || 'https://evolution.gpscell.site');
    setEvoKey(userAttributes.fin_evo_key || '');
    setEvoInst(userAttributes.fin_evo_instance || window.location.hostname);
    setGwAtivo(userAttributes.fin_gw_ativo || 'mercadopago');
    setGwToken(userAttributes.fin_gw_token || '');
    setGwUrlWebhook(userAttributes.fin_gw_webhook || ('https://' + window.location.hostname + '/api/webhook/mercadopago'));
    if (userAttributes.fin_evo_key && userAttributes.fin_evo_instance) {
      testarConexao(userAttributes.fin_evo_url, userAttributes.fin_evo_key, userAttributes.fin_evo_instance);
    }
  }, []);

  const testarConexao = async (url, key, inst) => {
    if (!key || !inst) { setEvoStatus('desconhecido'); return; }
    try {
      const base = (url || '').replace(/\/$/, '');
      const r = await fetch(base + '/instance/connectionState/' + inst, { headers: { apikey: key } });
      if (r.ok) {
        const d = await r.json();
        setEvoStatus(d?.instance?.state === 'open' ? 'conectado' : 'desconectado');
      } else { setEvoStatus('desconectado'); }
    } catch (e) { setEvoStatus('desconectado'); }
  };

  const salvarConexao = async () => {
    setCarregando(true);
    try {
      const attrs = {
        ...userAttributes,
        fin_evo_url: evoUrl,
        fin_evo_key: evoKey,
        fin_evo_instance: evoInst,
        fin_gw_ativo: gwAtivo,
        fin_gw_token: gwToken,
        fin_gw_webhook: gwUrlWebhook,
      };
      await fetchOrThrow('/api/users/' + userId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, attributes: attrs }),
      });
      await testarConexao(evoUrl, evoKey, evoInst);
    } catch (e) {
      console.error(e);
      setEvoStatus('desconectado');
    } finally { setCarregando(false); }
  };

  const gerarQrCode = async () => {
    setCarregando(true);
    try {
      const base = (evoUrl || '').replace(/\/$/, '');
      const r = await fetch(base + '/instance/create', {
        method: 'POST',
        headers: { apikey: evoKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: evoInst, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
      });
      const d = await r.json();
      if (d?.qrcode?.base64) {
        const w = window.open('', '_blank');
        w.document.write('<img src="' + d.qrcode.base64 + '" style="width:400px" />');
      }
      await testarConexao(evoUrl, evoKey, evoInst);
    } catch (e) { console.error(e); } finally { setCarregando(false); }
  };

  const desconectar = async () => {
    setCarregando(true);
    try {
      const base = (evoUrl || '').replace(/\/$/, '');
      await fetch(base + '/instance/logout/' + evoInst, {
        method: 'DELETE',
        headers: { apikey: evoKey },
      });
      setEvoStatus('desconectado');
    } catch (e) { console.error(e); } finally { setCarregando(false); }
  };

  const copiarWebhook = () => { navigator.clipboard.writeText(gwUrlWebhook); };
  const toggleAberto = (id) => setAbertos((a) => ({ ...a, [id]: !a[id] }));
  const iconePorTipo = (tipo) => tipo === 'card' ? <CreditCardIcon sx={{ fontSize: 20 }} /> : <WifiIcon sx={{ fontSize: 20 }} />;
  const corBadge = (id) => {
    if (id === 1) return evoStatus === 'conectado' ? { bg: '#16a34a', txt: 'Conectado' } : { bg: '#dc2626', txt: 'Desconectado' };
    return { bg: '#2563eb', txt: 'Ativa' };
  };

  useEffect(() => {
    setEvoUrl(userAttributes.fin_evo_url || 'https://evolution.gpscell.site');
    setEvoKey(userAttributes.fin_evo_key || '');
    setEvoInst(userAttributes.fin_evo_instance || window.location.hostname);
    setGwAtivo(userAttributes.fin_gw_ativo || 'mercadopago');
    setGwToken(userAttributes.fin_gw_token || '');
    setGwUrlWebhook(userAttributes.fin_gw_webhook || ('https://' + window.location.hostname + '/api/webhook/mercadopago'));
    if (userAttributes.fin_evo_key && userAttributes.fin_evo_instance) {
      testarConexao(userAttributes.fin_evo_url, userAttributes.fin_evo_key, userAttributes.fin_evo_instance);
    }
  }, []);


  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {cards.map((c) => {
          const badge = corBadge(c.id);
          return (
          <Paper key={c.id} elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
              <Box sx={{ color: '#3b82f6', display: 'flex' }}>{iconePorTipo(c.icone)}</Box>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{c.titulo}</Typography>
              <Chip label={badge.txt} size='small' sx={{ backgroundColor: badge.bg, color: '#ffffff', fontWeight: 700, fontSize: '0.7rem', height: 22 }} />
              <Box sx={{ flexGrow: 1 }} />
              <IconButton size='small' onClick={() => toggleAberto(c.id)}>
                {abertos[c.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Collapse in={!!abertos[c.id]}>
              {c.id === 1 ? (
                <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: '1px solid #f1f5f9' }}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1 }}>URL da API</Typography>
                  <TextField fullWidth size='small' value={evoUrl} onChange={(e) => setEvoUrl(e.target.value)} sx={{ mb: 2.5 }} />
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1 }}>API Key</Typography>
                  <TextField fullWidth size='small' type='password' value={evoKey} onChange={(e) => setEvoKey(e.target.value)} sx={{ mb: 2.5 }} />
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1 }}>Nome da Instância</Typography>
                  <TextField fullWidth size='small' value={evoInst} InputProps={{ readOnly: true }} sx={{ mb: 2.5, backgroundColor: '#f1f5f9' }} />
                  <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5 }}>
                    <Button variant='contained' startIcon={carregando ? <CircularProgress size={16} color='inherit' /> : <SaveIcon />} onClick={salvarConexao} disabled={carregando} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', backgroundColor: '#2563eb' }}>Salvar</Button>
                    <Button variant='outlined' startIcon={<QrCodeIcon />} onClick={gerarQrCode} disabled={carregando || !evoKey} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', color: '#475569', borderColor: '#e2e8f0' }}>Gerar QR Code</Button>
                  </Box>
                  <Box sx={{ p: 2, backgroundColor: evoStatus === 'conectado' ? '#f0fdf4' : '#fef2f2', borderRadius: '12px', border: '1px solid ' + (evoStatus === 'conectado' ? '#bbf7d0' : '#fecaca'), display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <WifiIcon sx={{ color: evoStatus === 'conectado' ? '#16a34a' : '#dc2626', fontSize: 20 }} />
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: evoStatus === 'conectado' ? '#16a34a' : '#dc2626', flexGrow: 1 }}>{evoStatus === 'conectado' ? 'WhatsApp conectado!' : 'WhatsApp desconectado'}</Typography>
                    {evoStatus === 'conectado' && (
                      <Button variant='contained' startIcon={<LogoutIcon />} onClick={desconectar} disabled={carregando} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', backgroundColor: '#dc2626' }}>Desconectar</Button>
                    )}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: '1px solid #f1f5f9' }}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1 }}>Gateway Ativo para Cobranças</Typography>
                  <TextField select fullWidth size='small' value={gwAtivo} onChange={(e) => setGwAtivo(e.target.value)} sx={{ mb: 3 }}>
                    <MenuItem value='mercadopago'>Mercado Pago</MenuItem>
                    <MenuItem value='asaas'>Asaas</MenuItem>
                  </TextField>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1 }}>Access Token</Typography>
                  <TextField fullWidth size='small' type='password' value={gwToken} onChange={(e) => setGwToken(e.target.value)} sx={{ mb: 3 }} />
                  <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 1.5 }}>URL do Webhook</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField fullWidth size='small' value={gwUrlWebhook} InputProps={{ readOnly: true }} />
                      <IconButton size='small' onClick={copiarWebhook} sx={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <ContentCopyIcon fontSize='small' />
                      </IconButton>
                    </Box>
                    <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 1 }}>Cole esta URL nas configurações de webhook do gateway.</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button variant='contained' startIcon={carregando ? <CircularProgress size={16} color='inherit' /> : <SaveIcon />} onClick={salvarConexao} disabled={carregando} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', backgroundColor: '#2563eb' }}>Salvar</Button>
                  </Box>
                </Box>
              )}
            </Collapse>
          </Paper>
          );
        })}
      </Box>
    </Box>
  );
};

export default ConexoesTab;
