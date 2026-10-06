import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, CircularProgress } from '@mui/material';
import { useSelector } from 'react-redux';

const TelegramLinkModal = ({ onClose }) => {
  const user = useSelector((state) => state.session.user);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    fetch('/api-telegram/status?user_id=' + user.id)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, [user.id]);

  const gerarLink = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api-telegram/link-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const d = await r.json();
      if (d.deep_link) {
        const m = d.deep_link.match(/t\.me\/(.+)/);
        window.location.href = m ? '/t/' + m[1] : d.deep_link;
      }
      setData({ ...data, ...d });
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  };

  const desvincular = async () => {
    setLoading(true);
    try {
      await fetch('/api-telegram/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      setData({ ...data, linked: false });
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Notificacoes via Telegram</DialogTitle>
      <DialogContent>
        {loading && <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>}
        {erro && <Typography color='error'>{erro}</Typography>}
        {!loading && data && (
          <>
            {data.linked ? (
              <>
                <Typography sx={{ mb: 2 }}>Telegram vinculado com sucesso!</Typography>
                <Button variant='outlined' color='error' onClick={desvincular} fullWidth sx={{ textTransform: 'none', fontWeight: 700 }}>
                  Desvincular
                </Button>
              </>
            ) : (
              <>
                <Typography sx={{ mb: 2, fontSize: '0.9rem', color: '#475569' }}>
                  Clique no botao abaixo para abrir o Telegram. Depois clique em <b>START</b> no bot e pronto!
                </Typography>
                <Button variant='contained' onClick={gerarLink} fullWidth sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#0088cc' }}>
                  Vincular Telegram
                </Button>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TelegramLinkModal;
