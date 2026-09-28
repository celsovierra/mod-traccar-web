import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, CircularProgress, Button, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ErrorIcon from '@mui/icons-material/Error';

const fmtBR = (n) => Number(n || 0).toFixed(2).replace('.', ',');

const PagamentoPage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [erro, setErro] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!token) { setErro('Link invalido'); setLoading(false); return; }
    const buscar = () => {
      fetch('/api-financeiro/pagamento/' + token)
        .then((r) => r.json())
        .then((d) => {
          if (!d.success) { setErro(d.error || 'Nao encontrado'); return; }
          setData(d.data);
          if (d.data.status === 'Pago') return;
          setTimeout(buscar, 5000);
        })
        .catch(() => setErro('Erro ao carregar'))
        .finally(() => setLoading(false));
    };
    buscar();
  }, [token]);

  const copiar = () => {
    navigator.clipboard.writeText(data.pix_copia_cola || '');
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  if (erro) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400, borderRadius: 3 }}>
        <ErrorIcon sx={{ fontSize: 60, color: '#dc2626', mb: 2 }} />
        <Typography variant='h6' sx={{ fontWeight: 700, mb: 1 }}>Ops!</Typography>
        <Typography sx={{ color: '#64748b' }}>{erro}</Typography>
      </Paper>
    </Box>
  );

  if (data.status === 'Pago') return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400, borderRadius: 3 }}>
        <CheckCircleIcon sx={{ fontSize: 80, color: '#22c55e', mb: 2 }} />
        <Typography variant='h5' sx={{ fontWeight: 700, mb: 1 }}>Pagamento Confirmado!</Typography>
        <Typography sx={{ color: '#64748b' }}>Obrigado, {data.nome || ''}!</Typography>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', justifyContent: 'center', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 480 }}>
        <Box sx={{ textAlign: 'center', color: '#fff', pt: 2, pb: 3 }}>
          <Typography sx={{ fontSize: '0.85rem', color: '#94a3b8' }}>Pagamento Seguro via PIX</Typography>
        </Box>

        <Paper sx={{ p: 3, borderRadius: 3, mb: 2, backgroundColor: '#1e293b', color: '#fff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {(data.nome || 'C').charAt(0).toUpperCase()}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{data.nome || 'Cliente'}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>Vencimento: {data.vencimento || '-'}</Typography>
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#334155', mb: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Valor original</Typography>
            <Typography>R$ {fmtBR(data.valor_num)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ color: '#ef4444', fontSize: '0.85rem' }}>Multa</Typography>
            <Typography sx={{ color: '#ef4444' }}>+ R$ {fmtBR(data.multa)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ color: '#ef4444', fontSize: '0.85rem' }}>Juros</Typography>
            <Typography sx={{ color: '#ef4444' }}>+ R$ {fmtBR(data.juros)}</Typography>
          </Box>

          <Divider sx={{ borderColor: '#334155', my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>Total</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '1.4rem', color: '#22c55e' }}>R$ {fmtBR(data.total)}</Typography>
          </Box>
        </Paper>

        {data.qr_code_base64 && (
          <Paper sx={{ p: 2, borderRadius: 3, mb: 2, backgroundColor: '#fff', textAlign: 'center' }}>
            <img src={'data:image/png;base64,' + data.qr_code_base64} alt='QR Code PIX' style={{ width: '100%', maxWidth: 280 }} />
          </Paper>
        )}

        <Paper sx={{ p: 3, borderRadius: 3, mb: 2, backgroundColor: '#1e293b', color: '#fff' }}>
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mb: 1, textAlign: 'center' }}>COMO PAGAR: 1. Abra o banco  2. PIX Copia e Cola  3. Confirme</Typography>
          <Divider sx={{ borderColor: '#334155', mb: 2 }} />
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mb: 1 }}>PIX Copia e Cola:</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ flexGrow: 1, p: 1.5, backgroundColor: '#0f172a', borderRadius: 2, fontSize: '0.7rem', wordBreak: 'break-all', maxHeight: 80, overflow: 'auto' }}>
              {data.pix_copia_cola || 'Aguardando...'}
            </Box>
            <Button onClick={copiar} variant='contained' startIcon={<ContentCopyIcon />} sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: copiado ? '#22c55e' : '#2563eb', minWidth: 100 }}>
              {copiado ? 'Copiado!' : 'Copiar'}
            </Button>
          </Box>
        </Paper>

        <Typography sx={{ textAlign: 'center', color: '#64748b', fontSize: '0.7rem', pb: 3 }}>
          Esta pagina atualiza automaticamente a cada 5 segundos.
        </Typography>
      </Box>
    </Box>
  );
};

export default PagamentoPage;
