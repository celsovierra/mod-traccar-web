import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Tabs,
  Tab,
  Collapse,
  Paper,
  CircularProgress
} from '@mui/material';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ErrorIcon from '@mui/icons-material/Error';

import {
  sendSms,
  getBalance,
  saveCredentials,
  getCredentials,
  normalizeBrazilPhone,
  getStatusInfo,
  getMessageStatus
} from './smsMarketService';

const SmsMarketModal = ({ device, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState(device?.phone || '');
  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [creds, setCreds] = useState({ user: '', pass: '' });
  const [reports, setReports] = useState(() => { try { return JSON.parse(localStorage.getItem('smsmarket_reports') || '[]'); } catch { return []; } });
  const [savedCommands, setSavedCommands] = useState([]);
  const [commandName, setCommandName] = useState('');
  const [commandText, setCommandText] = useState('');
  const [loadingCommands, setLoadingCommands] = useState(false);
  const [savedGroups, setSavedGroups] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [selectedCommandIds, setSelectedCommandIds] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    localStorage.setItem('smsmarket_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    const loadedCreds = getCredentials();
    setCreds(loadedCreds);
    if (loadedCreds.user && loadedCreds.pass) {
      loadBalance();
    }
    loadCommands();
  }, []);

  const loadCommands = async () => {
    try {
      setLoadingCommands(true);
      const response = await fetch('/api/commands');
      if (!response.ok) throw new Error('Não foi possível carregar os comandos do Traccar.');
      const data = await response.json();
      const commands = Array.isArray(data) ? data : [];
      setSavedCommands(commands.filter((command) => command.type === 'custom' && !command.attributes?.smsMarketGroup));
      setSavedGroups(commands.filter((command) => command.type === 'custom' && command.attributes?.smsMarketGroup));
    } catch (error) {
      console.error('Erro ao carregar comandos:', error);
    } finally {
      setLoadingCommands(false);
    }
  };

  const saveCommand = async () => {
    const name = commandName.trim();
    const text = commandText.trim();
    if (!name || !text) {
      alert('Informe o nome e o texto do comando.');
      return;
    }
    try {
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: name, type: 'custom', attributes: { text } })
      });
      if (!response.ok) throw new Error('Não foi possível salvar o comando no Traccar.');
      setCommandName('');
      setCommandText('');
      await loadCommands();
      alert('Comando salvo para todos os aparelhos.');
    } catch (error) {
      alert(error.message || 'Erro ao salvar comando.');
    }
  };

  const toggleCommandInGroup = (id) => {
    setSelectedCommandIds((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
  };

  const saveGroup = async () => {
    const name = groupName.trim();
    if (!name) { alert('Informe o nome do grupo.'); return; }
    if (selectedCommandIds.length === 0) { alert('Selecione pelo menos um comando.'); return; }
    try {
      setLoadingGroups(true);
      const response = await fetch('/api/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: name, type: 'custom', attributes: { smsMarketGroup: true, commandIds: selectedCommandIds } }) });
      if (!response.ok) throw new Error('Não foi possível salvar o grupo no Traccar.');
      setGroupName('');
      setSelectedCommandIds([]);
      await loadCommands();
      alert('Grupo salvo com sucesso.');
    } catch (error) { alert(error.message || 'Erro ao salvar grupo.'); } finally { setLoadingGroups(false); }
  };

  const sendGroup = async (group) => {
    const ids = group.attributes?.commandIds || [];
    const commands = savedCommands.filter((command) => ids.includes(command.id));
    if (commands.length === 0) { alert('Este grupo não possui comandos válidos.'); return; }
    if (!window.confirm('Enviar ' + commands.length + ' comando(s) por SMS?')) return;
    try {
      setSending(true);
      for (const command of commands) {
        const text = command.attributes?.text || '';
        if (text) await sendSms(normalizeBrazilPhone(phone), text);
      }
      alert('Comandos do grupo enviados.');
      await loadBalance();
    } catch (error) { alert(error.message || 'Erro ao enviar o grupo.'); } finally { setSending(false); }
  };

  const loadBalance = async () => {
    setLoadingBalance(true);
    try {
      const bal = await getBalance();
      setBalance(bal);
    } catch (e) {
      setBalance('Erro');
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleSaveCreds = async () => {
    try {
      setLoadingBalance(true);
      const bal = await saveCredentials(creds);
      setBalance(bal);
      setShowSettings(false);
      alert('Credenciais salvas e testadas com sucesso!');
    } catch (error) {
      alert(error?.message || 'Erro ao salvar credenciais.');
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleSend = async (type) => {
    if (!creds?.user?.trim() || !creds?.pass?.trim()) {
      alert('Configure o usuário e a senha do SMS Market na engrenagem.');
      setShowSettings(true);
      return;
    }

    let normalizedPhone = '';
    try {
      normalizedPhone = normalizeBrazilPhone(phone);
    } catch (err) {
      alert(err?.message || 'Telefone inválido.');
      return;
    }

    if (!message.trim()) {
      alert('Digite uma mensagem ou comando antes de enviar.');
      return;
    }

    try {
      setSending(true);
      const res = await sendSms(normalizedPhone, message.trim());
      const messageId = res?.id || null;
      const responseCode = res?.responseCode || '000';
      const initialStatus = responseCode === '000' ? 'ENFILEIRADA' : 'ACEITA';
      const statusInfo = getStatusInfo(initialStatus === 'ENFILEIRADA' ? '-1' : '0');

      const report = {
        id: Date.now(),
        smsMarketId: messageId,
        campaignId: res?.campaignId || null,
        responseCode,
        status: initialStatus,
        statusCode: initialStatus === 'ENFILEIRADA' ? '-1' : '0',
        terminal: false,
        type,
        time: new Date().toLocaleTimeString('pt-BR'),
        text: message.trim(),
        phone: normalizedPhone,
        deviceName: device?.name || 'Veículo',
        response: res
      };

      setReports((prev) => [report, ...prev]);
      setMessage('');
      await loadBalance();

      if (responseCode === '000') {
        alert(messageId ? `Mensagem aceita.\nID: ${messageId}` : 'Mensagem enfileirada.');
      } else {
        alert('A SMSMarket retornou uma resposta inesperada.');
      }
    } catch (error) {
      console.error('Erro ao enviar SMS:', error);
      const errStatus = '-11';
      const errInfo = getStatusInfo(errStatus);

      setReports((prev) => [
        {
          id: Date.now(),
          smsMarketId: null,
          campaignId: null,
          responseCode: error?.responseCode || null,
          status: errInfo.label,
          statusCode: errStatus,
          terminal: errInfo.terminal,
          type,
          time: new Date().toLocaleTimeString('pt-BR'),
          text: message.trim(),
          phone,
          deviceName: device?.name || 'Veículo',
          error: error?.message || 'Erro desconhecido'
        },
        ...prev
      ]);
      alert(error?.message || 'Erro ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  };

  const isSuccessStatus = (status) => {
    return ['ENTREGUE', 'LIDA', 'ENVIADA', 'RESPONDIDA'].includes(status);
  };

  const isPendingStatus = (status) => {
    return ['ENFILEIRADA', 'ACEITA', 'AGUARDANDO', 'PREPARANDO', 'PAUSADA'].includes(status);
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!reports || reports.length === 0) return;

      const hasPending = reports.some(r => r.smsMarketId && (!r.terminal && r.status !== 'ENTREGUE' && r.status !== 'LIDA'));
      if (!hasPending) return;

      const updatedReports = await Promise.all(
        reports.map(async (rep) => {
          if (rep.terminal || !rep.smsMarketId || rep.status === 'ENTREGUE' || rep.status === 'LIDA') {
            return rep;
          }

          try {
            console.log('CONSULTANDO STATUS PARA ID:', rep.smsMarketId);
            const statusRes = await getMessageStatus({
              id: rep.smsMarketId,
              campaignId: rep.campaignId
            });

            if (statusRes && statusRes.statusInfo) {
              return {
                ...rep,
                status: statusRes.statusInfo.label,
                statusCode: statusRes.status,
                terminal: statusRes.statusInfo.terminal,
                carrier: statusRes.carrier || rep.carrier
              };
            }
          } catch (e) {
            // Mantém o estado atual se falhar temporariamente
          }
          return rep;
        })
      );

      setReports(updatedReports);
    }, 4000);

    return () => clearInterval(interval);
  }, [reports]);

  const displayBalance = balance === null || balance === undefined || balance === '' ? '--' : balance;

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px', p: 2, m: 1, maxHeight: '90vh' } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" px={1} pt={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <FlashOnIcon color="primary" />
          <Typography variant="h6" fontWeight="bold" color="#1976d2">
            SMS MARKET
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Paper variant="outlined" sx={{ px: 1.5, py: 0.3, bgcolor: '#e3f2fd', borderColor: '#90caf9', borderRadius: '8px', minWidth: '75px', textAlign: 'center' }}>
            <Typography variant="body2" color={balance === null ? 'error' : 'primary'} fontWeight="bold">
              {loadingBalance ? <CircularProgress size={14} thickness={5} /> : `SMS: ${displayBalance}`}
            </Typography>
          </Paper>
          <IconButton onClick={() => setShowSettings(!showSettings)} size="small" color="primary">
            <SettingsIcon />
          </IconButton>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Collapse in={showSettings}>
        <Box p={2} mb={2} bgcolor="#f1f8e9" borderRadius="8px" border="1px solid #c8e6c9">
          <Typography variant="subtitle2" fontWeight="bold" color="success.dark" mb={1}>
            Configurar Credenciais SMS Market
          </Typography>
          <TextField
            size="small"
            fullWidth
            label="Usuário / Login"
            value={creds.user}
            onChange={(e) => setCreds({ ...creds, user: e.target.value })}
            sx={{ mb: 1, bgcolor: '#fff' }}
          />
          <TextField
            size="small"
            fullWidth
            type="password"
            label="Senha"
            value={creds.pass}
            onChange={(e) => setCreds({ ...creds, pass: e.target.value })}
            sx={{ mb: 1, bgcolor: '#fff' }}
          />
          <Button variant="contained" size="small" color="success" onClick={handleSaveCreds} disabled={loadingBalance} fullWidth>
            {loadingBalance ? 'VALIDANDO...' : 'SALVAR CREDENCIAIS'}
          </Button>
        </Box>
      </Collapse>

      <Tabs value={tabValue} onChange={(e, value) => setTabValue(value)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider', px: 1, pt: 1 }}>
        <Tab icon={<EditIcon />} label="Personalizado" iconPosition="top" />
        <Tab icon={<FlashOnIcon />} label="Cmd Pronto" iconPosition="top" />
        <Tab icon={<Inventory2Icon />} label="Grupo" iconPosition="top" />
        <Tab icon={<SmartphoneIcon />} label="SMS Avulso" iconPosition="top" />
      </Tabs>

      <DialogContent sx={{ px: 2, py: 2 }}>
        <Box mb={2} p={1.5} bgcolor="#f8f9fa" borderRadius="8px" border="1px solid #e0e0e0" display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="textSecondary" fontWeight="medium">
            Tel: {phone || 'Não cadastrado'}
          </Typography>
          <Typography variant="caption" fontWeight="bold" color={phone ? 'primary.main' : 'error.main'}>
            {phone ? 'Disponível' : 'Cadastre no veículo'}
          </Typography>
        </Box>

        {tabValue === 2 ? (
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" color="primary" mb={1}>
              CRIAR GRUPO DE COMANDOS
            </Typography>

            <TextField
              fullWidth
              size="small"
              label="Nome do grupo"
              placeholder="Exemplo: Bloqueio e alarme"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={loadingGroups}
              sx={{ mb: 1.5 }}
            />

            <Typography variant="body2" fontWeight="bold" mb={1}>
              Selecione os comandos do grupo:
            </Typography>

            <Box display="flex" flexDirection="column" gap={1} mb={1.5}>
              {savedCommands.map((command) => (
                <Paper
                  key={command.id}
                  variant="outlined"
                  onClick={() => toggleCommandInGroup(command.id)}
                  sx={{
                    p: 1.2,
                    cursor: 'pointer',
                    borderColor: selectedCommandIds.includes(command.id) ? '#1976d2' : '#e0e0e0',
                    bgcolor: selectedCommandIds.includes(command.id) ? '#e3f2fd' : '#fff'
                  }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {selectedCommandIds.includes(command.id) ? '✓ ' : ''}{command.description}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {command.attributes?.text || 'Sem texto configurado'}
                  </Typography>
                </Paper>
              ))}
            </Box>

            <Button variant="contained" fullWidth onClick={saveGroup} disabled={loadingGroups} sx={{ mb: 2, fontWeight: 'bold' }}>
              {loadingGroups ? 'SALVANDO...' : 'SALVAR GRUPO'}
            </Button>

            <Typography variant="subtitle2" fontWeight="bold" color="primary" mb={1}>
              GRUPOS CADASTRADOS
            </Typography>

            {savedGroups.length === 0 ? (
              <Typography variant="body2" color="textSecondary">Nenhum grupo cadastrado ainda.</Typography>
            ) : (
              <Box display="flex" flexDirection="column" gap={1}>
                {savedGroups.map((group) => (
                  <Paper key={group.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" fontWeight="bold">{group.description}</Typography>
                    <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                      {(group.attributes?.commandIds || []).length} comando(s) selecionado(s)
                    </Typography>
                    <Button size="small" variant="contained" onClick={() => sendGroup(group)} disabled={sending}>
                      ENVIAR GRUPO POR SMS
                    </Button>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        ) : tabValue === 1 ? (
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" color="primary" mb={1}>
              CADASTRAR COMANDO PRONTO
            </Typography>

            <TextField
              fullWidth
              size="small"
              label="Nome do comando"
              placeholder="Exemplo: Bloquear veículo"
              value={commandName}
              onChange={(e) => setCommandName(e.target.value)}
              disabled={loadingCommands}
              sx={{ mb: 1.5 }}
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Texto do comando"
              placeholder="Exemplo: bloqueio123"
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              disabled={loadingCommands}
              sx={{ mb: 1.5 }}
            />

            <Button
              variant="contained"
              fullWidth
              onClick={saveCommand}
              disabled={loadingCommands}
              sx={{ mb: 2, fontWeight: 'bold' }}
            >
              {loadingCommands ? 'CARREGANDO...' : 'SALVAR COMANDO'}
            </Button>

            <Typography variant="subtitle2" fontWeight="bold" color="primary" mb={1}>
              COMANDOS CADASTRADOS
            </Typography>

            {savedCommands.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Nenhum comando cadastrado ainda.
              </Typography>
            ) : (
              <Box display="flex" flexDirection="column" gap={1}>
                {savedCommands.map((command) => (
                  <Paper
                    key={command.id}
                    variant="outlined"
                    onClick={() => setMessage(command.attributes?.text || '')}
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#e3f2fd' }
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {command.description}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {command.attributes?.text || 'Sem texto configurado'}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        ) : (
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Digite o comando ou mensagem..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          variant="outlined"
          disabled={sending}
          sx={{ mb: 2, bgcolor: '#f8f9fa' }}
        />

        )}

        <Box display="flex" gap={1.5} mb={3}>
          <Button
            variant="contained"
            startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            onClick={() => handleSend('GPRS')}
            disabled={sending}
            fullWidth
            sx={{ py: 1.2, fontWeight: 'bold', bgcolor: '#90caf9', color: '#fff', '&:hover': { bgcolor: '#64b5f6' } }}
          >
            GPRS
          </Button>
          <Button
            variant="contained"
            startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            onClick={() => handleSend('SMS')}
            disabled={sending}
            fullWidth
            sx={{ py: 1.2, fontWeight: 'bold', bgcolor: '#ffe0b2', color: '#e65100', '&:hover': { bgcolor: '#ffe0b2' } }}
          >
            SMS
          </Button>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle2" fontWeight="bold" color="#1976d2">
              RELATÓRIO
            </Typography>
            <Paper sx={{ px: 1, py: 0.1, bgcolor: '#1976d2', color: '#fff', fontSize: '11px', borderRadius: '10px', fontWeight: 'bold' }}>
              {reports.length}
            </Paper>
          </Box>
          <Typography variant="caption" color="error" sx={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setReports([])}>
            LIMPAR
          </Typography>
        </Box>

        <Box display="flex" flexDirection="column" gap={1.5}>
          {reports.map((rep) => {
            const success = isSuccessStatus(rep.status);
            const pending = isPendingStatus(rep.status);

            return (
              <Paper
                key={rep.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  borderColor: success ? '#a5d6a7' : pending ? '#90caf9' : '#ef9a9a',
                  bgcolor: success ? '#f1f8e9' : pending ? '#e3f2fd' : '#ffebee'
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {pending ? (
                      <CircularProgress size={14} thickness={5} color="primary" />
                    ) : success ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : (
                      <ErrorIcon color="error" fontSize="small" />
                    )}
                    <Typography variant="body2" fontWeight="bold" color={success ? 'success.main' : pending ? 'primary.main' : 'error.main'}>
                      {rep.status}
                    </Typography>
                    <Typography variant="caption" bgcolor="#e0e0e0" px={1} py={0.2} borderRadius="4px" fontWeight="bold">
                      {rep.type}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {rep.time}
                  </Typography>
                </Box>

                <Typography variant="body2" fontFamily="monospace" fontWeight="bold">
                  {rep.text}
                </Typography>

                <Typography variant="caption" color="textSecondary" display="flex" alignItems="center" gap={0.5} mt={0.5}>
                  🚗 {rep.deviceName} ({rep.phone})
                </Typography>

                {rep.smsMarketId && (
                  <Typography variant="caption" color="textSecondary" display="block" mt={0.5}>
                    ID SMSMarket: {rep.smsMarketId}
                  </Typography>
                )}

                {rep.responseCode && (
                  <Typography variant="caption" color="textSecondary" display="block" mt={0.3}>
                    Código: {rep.responseCode}
                  </Typography>
                )}

                {rep.error && (
                  <Typography variant="caption" color="error" display="block" mt={0.5}>
                    {rep.error}
                  </Typography>
                )}
              </Paper>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SmsMarketModal;




