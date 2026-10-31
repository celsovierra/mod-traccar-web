import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sessionActions } from '../store';
import { Box, Button, Paper, Typography } from '@mui/material';

const pad = (n) => String(n).padStart(2, '0');
const hojeStr = () => {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
};
const PendenciaCard = () => {
  const user = useSelector((state) => state.session.user);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null);
  const [aviso, setAviso] = useState(null);
  const mostrarAviso = (texto, tipo) => {
    setAviso({ texto, tipo: tipo || 'warn' });
    setTimeout(() => setAviso(null), 5000);
  };

  useEffect(() => {
    const a = user?.attributes || {};
    if (!user || !a.fin_vencimento || !a.fin_valor || a.fin_nao_cobrar === 'true') return;
    const p = String(a.fin_vencimento).split('-');
    const venc = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dias = Math.round((hoje - venc) / 86400000);
    if (dias < 1) {
      setOpen(false);
      return;
    }
    const chave = 'pendenciaCard_' + user.id;
    try {
      if (dias <= 10 && localStorage.getItem(chave) === hojeStr()) return;
    } catch {
      /* sem storage */
    }
    let meses =
      (hoje.getFullYear() - venc.getFullYear()) * 12 + (hoje.getMonth() - venc.getMonth()) + 1;
    if (hoje.getDate() < venc.getDate()) meses -= 1;
    if (meses < 1) meses = 1;
    const valor = parseFloat(String(a.fin_valor).replace(',', '.')) || 0;
    setInfo({
      dias,
      bloqueado: dias > 10,
      valorBase: valor * meses,
      venc: p[2] + '/' + p[1] + '/' + p[0],
    });
    setOpen(true);
  }, [user]);
  const marcarHoje = () => {
    try {
      localStorage.setItem('pendenciaCard_' + user.id, hojeStr());
    } catch {
      /* sem storage */
    }
  };

  const jaPaguei = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/session');
      if (r.ok) {
        const u = await r.json();
        dispatch(sessionActions.updateUser(u));
        const v = u.attributes && u.attributes.fin_vencimento;
        if (v === user.attributes.fin_vencimento) {
          mostrarAviso(
            'Pagamento ainda n\u00e3o identificado. Aguarde alguns instantes e tente novamente.',
            'warn',
          );
        }
      }
    } catch {
      mostrarAviso('Erro ao verificar o pagamento.', 'erro');
    }
    setLoading(false);
  };

  const fechar = () => {
    marcarHoje();
    setOpen(false);
  };

  const pagar = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api-financeiro/gerar-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, nome: user.name || '', valor: info.valorBase }),
      });
      const j = await r.json();
      if (j.ok && j.link_pagamento) {
        marcarHoje();
        window.location.href = j.link_pagamento;
        return;
      }
      mostrarAviso(
        'N\u00e3o foi poss\u00edvel gerar o pagamento. Tente novamente mais tarde.',
        'erro',
      );
    } catch {
      mostrarAviso('Erro ao gerar o pagamento.', 'erro');
    }
    setLoading(false);
  };
  if (!open || !info) return null;

  const urgente = info.bloqueado;
  const cor = urgente ? '#ef4444' : '#f59e0b';
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: urgente
          ? 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)'
          : 'rgba(15,23,42,0.65)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 3.5,
          maxWidth: 400,
          width: '100%',
          borderRadius: '24px',
          textAlign: 'center',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
          borderTop: '6px solid ' + cor,
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            mx: 'auto',
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: cor + '22',
            fontSize: 36,
          }}
        >
          {urgente ? '\u{1F512}' : '\u26A0\uFE0F'}
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', mb: 0.5, color: '#0f172a' }}>
          {'Pend\u00eancia financeira'}
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '0.92rem', mb: 2 }}>
          {urgente
            ? 'Seu acesso est\u00e1 suspenso at\u00e9 a regulariza\u00e7\u00e3o do pagamento.'
            : 'Identificamos uma mensalidade em aberto. Regularize para evitar bloqueio.'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
          <Box sx={{ flex: 1, p: 1.2, borderRadius: '14px', backgroundColor: '#f1f5f9' }}>
            <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>Vencimento</Typography>
            <Typography sx={{ fontWeight: 700, color: '#0f172a' }}>{info.venc}</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 1.2, borderRadius: '14px', backgroundColor: cor + '1a' }}>
            <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>Em atraso</Typography>
            <Typography sx={{ fontWeight: 700, color: cor }}>{info.dias + ' dia(s)'}</Typography>
          </Box>
        </Box>
        {aviso && (
          <Box
            sx={{
              mb: 1.5,
              p: 1.3,
              borderRadius: '14px',
              textAlign: 'left',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: aviso.tipo === 'erro' ? '#fee2e2' : '#fef3c7',
              color: aviso.tipo === 'erro' ? '#991b1b' : '#92400e',
              border: '1px solid ' + (aviso.tipo === 'erro' ? '#fecaca' : '#fde68a'),
            }}
          >
            {(aviso.tipo === 'erro' ? '\u274C ' : '\u23F3 ') + aviso.texto}
          </Box>
        )}
        <Button
          fullWidth
          disabled={loading}
          onClick={pagar}
          variant="contained"
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            py: 1.4,
            mb: 1,
            borderRadius: '14px',
            fontSize: '1rem',
            backgroundColor: '#16a34a',
            boxShadow: '0 8px 20px rgba(22,163,74,0.35)',
          }}
        >
          {loading ? 'Aguarde...' : 'Pagar agora'}
        </Button>
        {urgente && (
          <Button
            fullWidth
            disabled={loading}
            onClick={jaPaguei}
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 700, py: 1.2, borderRadius: '14px' }}
          >
            {'J\u00e1 paguei'}
          </Button>
        )}
        {!urgente && (
          <Button
            fullWidth
            disabled={loading}
            onClick={fechar}
            sx={{ textTransform: 'none', color: '#64748b', borderRadius: '14px' }}
          >
            Fechar
          </Button>
        )}
      </Paper>
    </Box>
  );
};

export default PendenciaCard;
