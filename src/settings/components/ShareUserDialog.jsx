import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box } from '@mui/material';

const ShareUserDialog = ({ open, onClose, user }) => {
  const [senha, setSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSalvar = async () => {
    if (!senha || senha.length < 4) { setErro('Senha muito curta'); return; }
    setSalvando(true);
    setErro('');
    try {
      const payload = { ...user, password: senha };
      const r = await fetch('/api/users/' + user.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());

      const texto = 'Acesso ao rastreamento:\n\nEmail: ' + user.email + '\nSenha: ' + senha + '\n\nQualquer duvida estou a disposicao!';
      await navigator.clipboard.writeText(texto);
      alert('Senha alterada e texto copiado! Cole no WhatsApp.');
      setSenha('');
      onClose();
    } catch (e) {
      setErro('Erro: ' + e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Compartilhar acesso</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: '0.85rem', color: '#64748b', mb: 2 }}>
          Email: <b>{user?.email}</b>
        </Typography>
        <TextField fullWidth label="Nova senha" value={senha} onChange={(e) => setSenha(e.target.value)} type="text" size="small" autoFocus />
        {erro && <Typography color="error" sx={{ mt: 1, fontSize: '0.8rem' }}>{erro}</Typography>}
        <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f1f5f9', borderRadius: 1 }}>
          <Typography sx={{ fontSize: '0.75rem', color: '#475569' }}>
            Ao clicar em Salvar, a senha sera alterada e o texto sera copiado para colar no WhatsApp.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={salvando} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSalvar} disabled={salvando} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {salvando ? 'Salvando...' : 'Salvar e copiar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareUserDialog;
