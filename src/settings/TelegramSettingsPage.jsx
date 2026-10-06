import { useEffect, useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import { useSelector } from 'react-redux';
import fetchOrThrow from '../common/util/fetchOrThrow';

const TelegramSettingsPage = () => {
  const userAttributes = useSelector((state) => state.session.user.attributes) || {};
  const [token, setToken] = useState(userAttributes.fin_telegram_token || '');
  const [username, setUsername] = useState(userAttributes.fin_telegram_username || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const user = useSelector((state) => state.session.user);

  const salvar = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const attrs = { ...userAttributes, fin_telegram_token: token.trim(), fin_telegram_username: username.trim().replace(/^@/, '') };
      await fetchOrThrow('/api/users/' + user.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, name: user.name || '-', email: user.email || 'sem@local', attributes: attrs, administrator: user.administrator, masteruser: user.masteruser }),
      });
      setMsg({ tipo: 'success', texto: 'Configuracoes salvas!' });
    } catch (e) {
      setMsg({ tipo: 'error', texto: 'Erro: ' + e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'Notificacoes via Telegram']}>
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', mb: 2 }}>
            Configurar Bot do Telegram
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: '#64748b', mb: 2 }}>
            Crie um bot no @BotFather e cole o token + username abaixo. Seus clientes vão clicar no botão "Vincular Telegram" e serão vinculados automaticamente.
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Token do Bot (ex: 123456:ABC-DEF...)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            size="small"
            label="Username do Bot (ex: meubot)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" onClick={salvar} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700 }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
          {msg && <Alert severity={msg.tipo} sx={{ mt: 2 }}>{msg.texto}</Alert>}
        </Paper>
      </Box>
    </PageLayout>
  );
};

export default TelegramSettingsPage;