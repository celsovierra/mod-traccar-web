import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, CircularProgress, Button, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ErrorIcon from '@mui/icons-material/Error';

const fmtBR = (n) =>
  Number(n || 0)
    .toFixed(2)
    .replace('.', ',');

const PagamentoPage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [erro, setErro] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!token) {
      setErro('Link invalido');
      setLoading(false);
      return;
    }
    const buscar = () => {
      fetch('/api-financeiro/pagamento/' + token)
        .then((r) => r.json())
        .then((d) => {
          if (!d.success) {
            setErro(d.error || 'Nao encontrado');
            return;
          }
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

  if (loading)
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
      >
        <CircularProgress />
      </Box>
    );

  if (erro)
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          p: 2,
        }}
      >
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400, borderRadius: 3 }}>
          <ErrorIcon sx={{ fontSize: 60, color: '#dc2626', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Ops!
          </Typography>
          <Typography sx={{ color: '#64748b' }}>{erro}</Typography>
        </Paper>
      </Box>
    );

  if (data.status === 'Pago')
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          p: 2,
        }}
      >
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400, borderRadius: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: '#22c55e', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Pagamento Confirmado!
          </Typography>
          <Typography sx={{ color: '#64748b' }}>Obrigado, {data.nome || ''}!</Typography>
        </Paper>
      </Box>
    );

  return (
    <Box
      sx={{
        height: '100vh',
        maxHeight: '100vh',
        backgroundColor: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 1.5,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          gap: 1,
        }}
      >
        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
          Pagamento Seguro via PIX
        </Typography>

        <Paper sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#1e293b', color: '#fff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {(data.nome || 'C').charAt(0).toUpperCase()}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                {data.nome || 'Cliente'}
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                Venc: {data.vencimento || '-'}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', mb: 0.3 }}
          >
            <Typography sx={{ color: '#94a3b8', fontSize: '0.78rem' }}>Valor original</Typography>
            <Typography sx={{ fontSize: '0.78rem' }}>R$ {fmtBR(data.valor_num)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
            <Typography sx={{ color: '#ef4444', fontSize: '0.78rem' }}>Multa</Typography>
            <Typography sx={{ color: '#ef4444', fontSize: '0.78rem' }}>
              + R$ {fmtBR(data.multa)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ color: '#ef4444', fontSize: '0.78rem' }}>Juros</Typography>
            <Typography sx={{ color: '#ef4444', fontSize: '0.78rem' }}>
              + R$ {fmtBR(data.juros)}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: '#334155', mb: 0.5 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Total</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '1.3rem', color: '#22c55e' }}>
              R$ {fmtBR(data.total)}
            </Typography>
          </Box>
        </Paper>

        {data.qr_code_base64 && (
          <Paper
            sx={{
              p: 1,
              borderRadius: 2,
              backgroundColor: '#fff',
              textAlign: 'center',
              flexShrink: 0,
            }}
          >
            <img
              src={'data:image/png;base64,' + data.qr_code_base64}
              alt="QR Code PIX"
              style={{ width: '100%', maxHeight: '22vh', objectFit: 'contain' }}
            />
          </Paper>
        )}

        <Paper
          sx={{
            p: 1.5,
            borderRadius: 2,
            backgroundColor: '#1e293b',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography sx={{ fontSize: '0.68rem', color: '#94a3b8', mb: 0.8, textAlign: 'center' }}>
            PIX Copia e Cola
          </Typography>
          <Box
            sx={{
              p: 1,
              backgroundColor: '#0f172a',
              borderRadius: 1.5,
              fontSize: '0.65rem',
              wordBreak: 'break-all',
              overflow: 'hidden',
              mb: 1,
              maxHeight: 60,
            }}
          >
            {data.pix_copia_cola || 'Aguardando...'}
          </Box>
          <Button
            onClick={copiar}
            variant="contained"
            fullWidth
            startIcon={<ContentCopyIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '1rem',
              py: 1.5,
              backgroundColor: copiado ? '#22c55e' : '#2563eb',
              borderRadius: 2,
            }}
          >
            {copiado ? 'COPIADO!' : 'COPIAR PIX'}
          </Button>
        </Paper>

        <Typography sx={{ textAlign: 'center', color: '#64748b', fontSize: '0.65rem' }}>
          Atualiza a cada 5s
        </Typography>
      </Box>
    </Box>
  );
};

export default PagamentoPage;
