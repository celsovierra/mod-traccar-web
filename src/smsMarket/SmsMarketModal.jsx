import { useState, useEffect } from 'react';
import './smsMarketModern.css';
import './smsMarketMobile.css';
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
  CircularProgress,
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
import DeleteIcon from '@mui/icons-material/Delete';

import {
  sendSms,
  getBalance,
  saveCredentials,
  getCredentials,
  normalizeBrazilPhone,
  getStatusInfo,
  getMessageStatus,
} from './smsMarketService';

const SmsMarketModal = ({ device, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState(device?.phone || '');
  const [avulsoPhone, setAvulsoPhone] = useState('');
  const [avulsoChoice, setAvulsoChoice] = useState('');
  const [showSavedCommands, setShowSavedCommands] = useState(false);
  const [showSavedGroups, setShowSavedGroups] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingType, setSendingType] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [creds, setCreds] = useState({ user: '', pass: '' });
  const [reports, setReports] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('smsmarket_reports') || '[]');
    } catch {
      return [];
    }
  });
  const [savedCommands, setSavedCommands] = useState([]);
  const [commandName, setCommandName] = useState('');
  const [commandText, setCommandText] = useState('');
  const [showCreateCommand, setShowCreateCommand] = useState(false);
  const [loadingCommands, setLoadingCommands] = useState(false);
  const [savedGroups, setSavedGroups] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [selectedCommandIds, setSelectedCommandIds] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

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
      if (!response.ok) throw new Error('N�o foi poss�vel carregar os comandos do Traccar.');
      const data = await response.json();
      const commands = Array.isArray(data) ? data : [];
      setSavedCommands(
        commands.filter(
          (command) => command.type === 'custom' && !command.attributes?.smsMarketGroup,
        ),
      );
      setSavedGroups(
        commands.filter(
          (command) => command.type === 'custom' && command.attributes?.smsMarketGroup,
        ),
      );
      console.log(
        'TOTAL GRUPOS:',
        commands.filter(
          (command) => command.type === 'custom' && command.attributes?.smsMarketGroup,
        ).length,
      );
      console.log(
        'GRUPOS:',
        commands.filter(
          (command) => command.type === 'custom' && command.attributes?.smsMarketGroup,
        ),
      );
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
        body: JSON.stringify({ description: name, type: 'custom', attributes: { text } }),
      });
      if (!response.ok) throw new Error('N�o foi poss�vel salvar o comando no Traccar.');
      setCommandName('');
      setCommandText('');
      await loadCommands();
      alert('Comando salvo para todos os aparelhos.');
    } catch (error) {
      alert(error.message || 'Erro ao salvar comando.');
    }
  };

  const deleteCommand = async (id) => {
    if (!window.confirm('Excluir este comando?')) return;
    try {
      const response = await fetch(`/api/commands/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Nao foi possivel excluir o comando.');
      await loadCommands();
    } catch (error) {
      alert(error.message || 'Erro ao excluir comando.');
    }
  };

  const deleteGroup = async (id) => {
    if (!window.confirm('Excluir este grupo?')) return;
    try {
      const response = await fetch(`/api/commands/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Nao foi possivel excluir o grupo.');
      await loadCommands();
    } catch (error) {
      alert(error.message || 'Erro ao excluir grupo.');
    }
  };

  const toggleCommandInGroup = (id) => {
    setSelectedCommandIds((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    );
  };

  const saveGroup = async () => {
    const name = groupName.trim();
    if (!name) {
      alert('Informe o nome do grupo.');
      return;
    }
    if (selectedCommandIds.length === 0) {
      alert('Selecione pelo menos um comando.');
      return;
    }
    try {
      setLoadingGroups(true);
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: name,
          type: 'custom',
          attributes: { smsMarketGroup: true, commandIds: selectedCommandIds },
        }),
      });
      if (!response.ok) throw new Error('N�o foi poss�vel salvar o grupo no Traccar.');
      setGroupName('');
      setSelectedCommandIds([]);
      await loadCommands();
      alert('Grupo salvo com sucesso.');
    } catch (error) {
      alert(error.message || 'Erro ao salvar grupo.');
    } finally {
      setLoadingGroups(false);
    }
  };

  const sendGroup = async (group, phoneOverride = '') => {
    const ids = group.attributes?.commandIds || [];
    const commands = savedCommands.filter((command) => ids.includes(command.id));
    if (commands.length === 0) {
      alert('Este grupo n�o possui comandos v�lidos.');
      return;
    }
    if (!window.confirm('Enviar ' + commands.length + ' comando(s) por SMS?')) return;
    try {
      setSending(true);
      for (const command of commands) {
        const text = command.attributes?.text || '';
        if (text) await sendSms(normalizeBrazilPhone(phoneOverride || phone), text);
      }
      alert('Comandos do grupo enviados.');
      await loadBalance();
    } catch (error) {
      alert(error.message || 'Erro ao enviar o grupo.');
    } finally {
      setSending(false);
      setSendingType(null);
    }
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

  const handleSend = async (type, phoneOverride = '') => {
    if (tabValue === 2) setShowSavedGroups(false);
    if (tabValue !== 2 && !message.trim()) {
      alert('Digite uma mensagem ou comando antes de enviar.');
      return;
    }

    /* GPRS: envia pelo servidor/API do Traccar, sem usar saldo SMS Market */
    if (type === 'GPRS') {
      setSendingType('GPRS');
      if (!device?.id) {
        alert('Nenhum ve�culo foi selecionado.');
        return;
      }

      if ((device?.status || '').toLowerCase() !== 'online') {
        alert('Este ve�culo est� offline. Use SMS para enviar o comando.');
        return;
      }

      try {
        setSending(true);

        const response = await fetch('/api/commands/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: device.id,
            type: 'custom',
            text: message.trim(),
          }),
        });

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || 'O Traccar n�o aceitou o comando GPRS.');
        }

        setReports((prev) => [
          {
            id: Date.now(),
            smsMarketId: null,
            campaignId: null,
            responseCode: 'GPRS',
            status: 'ENVIADA',
            statusCode: 'GPRS',
            terminal: true,
            type: 'GPRS',
            time: new Date().toLocaleTimeString('pt-BR'),
            text: message.trim(),
            phone: phone || '',
            deviceName: device?.name || 'Ve�culo',
            response: { transport: 'Traccar GPRS' },
          },
          ...prev,
        ]);

        setMessage('');
        alert('Comando enviado via GPRS para o ve�culo online.');
      } catch (error) {
        console.error('Erro ao enviar GPRS:', error);

        setReports((prev) => [
          {
            id: Date.now(),
            smsMarketId: null,
            campaignId: null,
            responseCode: 'GPRS_ERRO',
            status: 'FALHA',
            statusCode: '-11',
            terminal: true,
            type: 'GPRS',
            time: new Date().toLocaleTimeString('pt-BR'),
            text: message.trim(),
            phone: phone || '',
            deviceName: device?.name || 'Ve�culo',
            error: error?.message || 'Erro ao enviar comando GPRS.',
          },
          ...prev,
        ]);

        alert(error?.message || 'Erro ao enviar comando via GPRS.');
      } finally {
        setSending(false);
        setSendingType(null);
      }

      return;
    }

    /* SMS: usa a SMS Market e desconta saldo normalmente */
    setSendingType('SMS');
    if (!creds?.user?.trim() || !creds?.pass?.trim()) {
      alert('Configure o usu�rio e a senha do ENVIAR COMANDO na engrenagem.');
      setShowSettings(true);
      return;
    }

    if (tabValue === 2 && selectedGroup) {
      const commandIds = selectedGroup.attributes?.commandIds || [];
      const groupCommands = savedCommands.filter((command) => commandIds.includes(command.id));

      if (groupCommands.length === 0) {
        alert('O grupo selecionado n�o possui comandos v�lidos.');
        return;
      }

      let groupPhone = '';
      try {
        groupPhone = normalizeBrazilPhone(phoneOverride || phone);
      } catch (err) {
        alert(err?.message || 'Telefone inv�lido.');
        return;
      }

      try {
        setSending(true);

        for (const command of groupCommands) {
          const commandText = command.attributes?.text || '';

          if (!commandText.trim()) {
            continue;
          }

          const res = await sendSms(groupPhone, commandText.trim());
          const messageId = res?.id || null;
          const responseCode = res?.responseCode || '000';

          setReports((prev) => [
            {
              id: Date.now() + Math.random(),
              smsMarketId: messageId,
              campaignId: res?.campaignId || null,
              responseCode,
              status: responseCode === '000' ? 'ENFILEIRADA' : 'ACEITA',
              statusCode: responseCode === '000' ? '-1' : '0',
              terminal: false,
              type: 'SMS',
              time: new Date().toLocaleTimeString('pt-BR'),
              text: commandText.trim(),
              phone: groupPhone,
              deviceName: device?.name || 'Ve�culo',
              response: res,
            },
            ...prev,
          ]);
        }

        setSelectedGroup(null);
        setMessage('');
        await loadBalance();
        alert('Todos os comandos do grupo foram enviados por SMS.');
      } catch (error) {
        console.error('Erro ao enviar grupo por SMS:', error);
        alert(
          'Nao foi possivel enviar o grupo por SMS. Verifique o saldo da SMS Market e tente novamente.',
        );
      } finally {
        setSending(false);
        setSendingType(null);
      }

      return;
    }
    let normalizedPhone = '';
    try {
      normalizedPhone = normalizeBrazilPhone(phoneOverride || phone);
    } catch (err) {
      alert(err?.message || 'Telefone inv�lido.');
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
        type: 'SMS',
        time: new Date().toLocaleTimeString('pt-BR'),
        text: message.trim(),
        phone: normalizedPhone,
        deviceName: device?.name || 'Ve�culo',
        response: res,
      };

      setReports((prev) => [report, ...prev]);
      setMessage('');
      await loadBalance();

      if (responseCode === '000') {
        alert(messageId ? `Mensagem aceita.` + '\nID: ' + messageId : 'Mensagem enfileirada.');
      } else {
        alert('A SMSMarket retornou uma resposta inesperada.');
      }
    } catch (error) {
      console.error('Erro ao enviar SMS:', error);
      const errInfo = getStatusInfo('-11');

      setReports((prev) => [
        {
          id: Date.now(),
          smsMarketId: null,
          campaignId: null,
          responseCode: error?.responseCode || null,
          status: errInfo.label,
          statusCode: '-11',
          terminal: errInfo.terminal,
          type: 'SMS',
          time: new Date().toLocaleTimeString('pt-BR'),
          text: message.trim(),
          phone: normalizedPhone || phone,
          deviceName: device?.name || 'Ve�culo',
          error: error?.message || 'Erro desconhecido',
        },
        ...prev,
      ]);

      alert(error?.message || 'Erro ao enviar mensagem.');
    } finally {
      setSending(false);
      setSendingType(null);
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

      const hasPending = reports.some(
        (r) => r.smsMarketId && !r.terminal && r.status !== 'ENTREGUE' && r.status !== 'LIDA',
      );
      if (!hasPending) return;

      const updatedReports = await Promise.all(
        reports.map(async (rep) => {
          if (
            rep.terminal ||
            !rep.smsMarketId ||
            rep.status === 'ENTREGUE' ||
            rep.status === 'LIDA'
          ) {
            return rep;
          }

          try {
            console.log('CONSULTANDO STATUS PARA ID:', rep.smsMarketId);
            const statusRes = await getMessageStatus({
              id: rep.smsMarketId,
              campaignId: rep.campaignId,
            });

            if (statusRes && statusRes.statusInfo) {
              return {
                ...rep,
                status: statusRes.statusInfo.label,
                statusCode: statusRes.status,
                terminal: statusRes.statusInfo.terminal,
                carrier: statusRes.carrier || rep.carrier,
              };
            }
          } catch (e) {
            // Mant�m o estado atual se falhar temporariamente
          }
          return rep;
        }),
      );

      setReports(updatedReports);
    }, 4000);

    return () => clearInterval(interval);
  }, [reports]);

  const displayBalance =
    balance === null || balance === undefined || balance === '' ? '--' : balance;

  return (
    <Dialog
      className="sms-market-modal"
      open={true}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '18px',
          m: { xs: 0, sm: 2 },
          width: { xs: '100%', sm: '440px' },
          height: { xs: '100%', sm: '88vh' },
          minHeight: { xs: '100%', sm: '88vh' },
          maxHeight: { xs: '100%', sm: '88vh' },
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        px={2}
        py={1.5}
        bgcolor="#ffffff"
        borderBottom="1px solid #edf2f7"
        sx={{ flexShrink: 0 }}
      >
        <Box display="flex" alignItems="center" gap={0.5}>
          <FlashOnIcon color="primary" />
          <Typography
            variant="subtitle1"
            fontWeight="800"
            color="#1976d2"
            sx={{ letterSpacing: 0.5, whiteSpace: 'nowrap' }}
          >
            ENVIAR COMANDO
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Paper
            variant="outlined"
            sx={{
              px: 1.5,
              py: 0.3,
              bgcolor: '#e8f0fe',
              borderColor: '#c2d7fa',
              borderRadius: '8px',
              minWidth: '70px',
              textAlign: 'center',
              boxShadow: 'none',
            }}
          >
            <Typography variant="caption" color="primary" fontWeight="bold">
              {loadingBalance ? (
                <CircularProgress size={12} thickness={5} />
              ) : (
                `SMS: ${displayBalance}`
              )}
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

      <Collapse in={showSettings} sx={{ mb: 2 }}>
        <Box p={2} mb={2} bgcolor="#f1f8e9" borderRadius="8px" border="1px solid #c8e6c9">
          <Typography variant="subtitle2" fontWeight="bold" color="success.dark" mb={1}>
            Configurar Credenciais ENVIAR COMANDO
          </Typography>
          <TextField
            size="small"
            fullWidth
            label="Usu�rio / Login"
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
          <Button
            variant="contained"
            size="small"
            color="success"
            onClick={handleSaveCreds}
            disabled={loadingBalance}
            fullWidth
          >
            {loadingBalance ? 'VALIDANDO...' : 'SALVAR CREDENCIAIS'}
          </Button>
        </Box>
      </Collapse>

      <Tabs
        value={tabValue}
        onChange={(e, value) => setTabValue(value)}
        variant="fullWidth"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          px: { xs: 0, sm: 2 },
          pt: 1,
          bgcolor: '#fff',
          '& .MuiTab-root': {
            minHeight: 68,
            fontSize: { xs: '0.65rem', sm: '0.75rem' },
            fontWeight: 'bold',
          },
          '& .Mui-selected': { color: '#1565c0' },
        }}
      >
        <Tab icon={<EditIcon />} label="Personalizado" iconPosition="top" />
        <Tab icon={<FlashOnIcon />} label="Cmd Pronto" iconPosition="top" />
        <Tab icon={<Inventory2Icon />} label="Grupo" iconPosition="top" />
        <Tab icon={<SmartphoneIcon />} label="SMS Avulso" iconPosition="top" />
      </Tabs>

      <DialogContent
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2.5,
          bgcolor: '#f7f9fc',
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          flex: 1,
        }}
      >
        {tabValue !== 3 && (
          <Box
            mb={2.5}
            p={1.5}
            bgcolor="#fff"
            borderRadius="12px"
            border="1px solid #dbe7f5"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            boxShadow="0 2px 8px rgba(25,118,210,0.08)"
          >
            <Typography variant="body2" color="textSecondary" fontWeight="medium">
              Tel: {phone || 'N�o cadastrado'}
            </Typography>
            <Typography
              variant="caption"
              fontWeight="bold"
              color={phone ? 'primary.main' : 'error.main'}
            >
              {phone ? '' : 'Cadastre no ve�culo'}
            </Typography>
          </Box>
        )}

        {tabValue === 2 ? (
          <Box
            sx={{
              bgcolor: '#fff',
              border: '1px solid #e3edf8',
              borderRadius: '8px',
              p: 1.5,
              mb: 1.5,
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              onClick={() => setShowCreateGroup(!showCreateGroup)}
              sx={{ cursor: 'pointer', userSelect: 'none' }}
            >
              <Typography variant="subtitle2" fontWeight="bold" color="primary">
                {showCreateGroup ? '- OCULTAR CRIA��O' : '+ CRIAR NOVO GRUPO'}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>
                {showCreateGroup ? 'Fechar' : 'Abrir'}
              </Typography>
            </Box>
            <Collapse in={showCreateGroup} sx={{ mt: showCreateGroup ? 1.5 : 0 }}>
              <TextField
                fullWidth
                size="small"
                label="Nome do grupo"
                placeholder="Exemplo: Bloqueio e alarme"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={loadingGroups}
                sx={{ mt: 1.5, mb: 1.5 }}
              />
              <Typography variant="body2" fontWeight="bold" mb={1}>
                Selecione os comandos do grupo:
              </Typography>
              <Box
                display="flex"
                flexDirection="column"
                gap={1}
                mb={2}
                sx={{ height: 300, maxHeight: 300, overflowY: 'scroll', pr: 0.5 }}
              >
                {savedCommands.map((command) => (
                  <Paper
                    key={command.id}
                    variant="outlined"
                    onClick={() => toggleCommandInGroup(command.id)}
                    sx={{
                      p: 1.2,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      borderColor: selectedCommandIds.includes(command.id) ? '#1976d2' : '#e0e0e0',
                      bgcolor: selectedCommandIds.includes(command.id) ? '#e3f2fd' : '#fff',
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {selectedCommandIds.includes(command.id) ? '? ' : ''}
                      {command.description}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {command.attributes?.text || 'Sem texto configurado'}
                    </Typography>
                  </Paper>
                ))}
              </Box>
              <Button
                variant="contained"
                fullWidth
                onClick={saveGroup}
                disabled={loadingGroups}
                sx={{ mb: 1, py: 1.1, fontWeight: 'bold', borderRadius: '10px' }}
              >
                {loadingGroups ? 'SALVANDO...' : 'SALVAR GRUPO'}
              </Button>
            </Collapse>
          </Box>
        ) : null}

        {tabValue === 2 ? (
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" color="primary" mb={1}>
              GRUPOS CADASTRADOS
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setShowSavedGroups(!showSavedGroups)}
              sx={{ mb: 1, borderRadius: '8px', textTransform: 'none', fontWeight: 'bold' }}
            >
              {showSavedGroups ? 'Fechar grupos' : 'Ver grupos criados'}
            </Button>

            {showSavedGroups &&
              (savedGroups.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  Nenhum grupo cadastrado ainda.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    width: '100%',
                    maxHeight: 160,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    pr: 0.5,
                  }}
                >
                  {savedGroups.map((group) => (
                    <Paper
                      key={group.id}
                      variant="outlined"
                      sx={{
                        p: 0.8,
                        width: '100%',
                        boxSizing: 'border-box',
                        flexShrink: 0,
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderColor: selectedGroup?.id === group.id ? '#1976d2' : '#dbe7f5',
                        bgcolor: selectedGroup?.id === group.id ? '#e3f2fd' : '#fbfdff',
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        onClick={() =>
                          setSelectedGroup(selectedGroup?.id === group.id ? null : group)
                        }
                        sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, cursor: 'pointer' }}
                      >
                        {group.description}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteGroup(group.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Paper>
                  ))}
                </Box>
              ))}
          </Box>
        ) : tabValue === 1 ? (
          <Box
            sx={{
              bgcolor: '#fff',
              border: '1px solid #e3edf8',
              borderRadius: '8px',
              p: 1.5,
              mb: 1.5,
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              onClick={() => setShowCreateCommand(!showCreateCommand)}
              sx={{ cursor: 'pointer', userSelect: 'none' }}
            >
              <Typography variant="subtitle2" fontWeight="bold" color="primary">
                {showCreateCommand ? '- OCULTAR CADASTRO' : '+ CADASTRAR NOVO COMANDO'}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>
                {showCreateCommand ? 'Fechar' : 'Abrir'}
              </Typography>
            </Box>
            <Collapse in={showCreateCommand} sx={{ mt: showCreateCommand ? 1.5 : 0 }}>
              <TextField
                fullWidth
                size="small"
                label="Nome do comando"
                placeholder="Exemplo: Bloquear ve�culo"
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
                sx={{ mb: 2.5, py: 1.2, fontWeight: 'bold', borderRadius: '10px' }}
              >
                {loadingCommands ? 'CARREGANDO...' : 'SALVAR COMANDO'}
              </Button>
            </Collapse>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setShowSavedCommands(!showSavedCommands)}
              sx={{ mb: 1, borderRadius: '8px', textTransform: 'none', fontWeight: 'bold' }}
            >
              {showSavedCommands ? 'Fechar comandos' : 'Ver comandos criados'}
            </Button>

            {showSavedCommands &&
              (savedCommands.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  Nenhum comando cadastrado ainda.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: showSavedCommands ? 'flex' : 'none',
                    flexDirection: 'column',
                    gap: 0.5,
                    width: '100%',
                    maxHeight: 200,
                    overflowY: 'auto',
                    pr: 0.5,
                  }}
                >
                {savedCommands.map((command) => (
                    <Paper
                      key={command.id}
                      variant="outlined"
                      onClick={() => setMessage(command.attributes?.text || '')}
                      sx={{
                        p: 1.5,
                        width: '100%',
                        boxSizing: 'border-box',
                        flexShrink: 0,
                        borderRadius: '10px',
                        borderColor: '#dbe7f5',
                        bgcolor: '#fbfdff',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        '&:hover': { bgcolor: '#e3f2fd' },
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {command.description}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {command.attributes?.text || 'Sem texto configurado'}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCommand(command.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Paper>
                  ))}
                </Box>
              ))}
          </Box>
        ) : (
          <>
            {tabValue === 3 && (
              <>
                <TextField
                  fullWidth
                  size="small"
                  label="Telefone para SMS avulso"
                  placeholder="DDD + numero. Exemplo: 11999998888"
                  value={avulsoPhone}
                  onChange={(e) => setAvulsoPhone(e.target.value)}
                  disabled={sending}
                  sx={{
                    mb: 1.5,
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                  }}
                />

                <Box
                  sx={{
                    mb: 2,
                    p: 1.5,
                    border: '1px solid #dbe7f5',
                    borderRadius: '10px',
                    bgcolor: '#f8fbff',
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    color="#1976d2"
                    display="block"
                    mb={1}
                  >
                    ESCOLHA O QUE DESEJA ENVIAR
                  </Typography>

                  <Box display="flex" gap={0.5} mb={avulsoChoice ? 1.5 : 0}>
                    <Button
                      variant={avulsoChoice === 'command' ? 'contained' : 'outlined'}
                      sx={{ flex: 1, minWidth: 0, textTransform: 'none' }}
                      size="small"
                      onClick={() => setAvulsoChoice(avulsoChoice === 'command' ? '' : 'command')}
                      disabled={sending}
                    >
                      Comandos prontos
                    </Button>

                    <Button
                      variant={avulsoChoice === 'group' ? 'contained' : 'outlined'}
                      sx={{ flex: 1, minWidth: 0, textTransform: 'none' }}
                      size="small"
                      onClick={() => setAvulsoChoice(avulsoChoice === 'group' ? '' : 'group')}
                      disabled={sending}
                    >
                      Grupos
                    </Button>
                  </Box>

                  {avulsoChoice === 'command' && (
                    <Box>
                      <Typography variant="caption" color="textSecondary" display="block" mb={0.15}>
                        COMANDOS PRONTOS
                      </Typography>
                      {savedCommands.length > 0 ? (
                        savedCommands.map((command) => (
                          <Button
                            key={command.id}
                            variant="outlined"
                            size="small"
                            fullWidth
                            disabled={sending}
                            onClick={() => setMessage(command.attributes?.text || '')}
                            sx={{ mb: 0.8, justifyContent: 'flex-start', textTransform: 'none' }}
                          >
                            {command.description}
                          </Button>
                        ))
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          Nenhum comando pronto cadastrado.
                        </Typography>
                      )}
                    </Box>
                  )}

                  {avulsoChoice === 'group' && (
                    <Box>
                      <Typography variant="caption" color="textSecondary" display="block" mb={0.15}>
                        GRUPOS CADASTRADOS
                      </Typography>
                      {savedGroups.length > 0 ? (
                        savedGroups.map((group) => (
                          <Button
                            key={group.id}
                            variant="contained"
                            size="small"
                            fullWidth
                            disabled={sending || !avulsoPhone.trim()}
                            onClick={() => sendGroup(group, avulsoPhone)}
                            sx={{
                              mb: 0.8,
                              justifyContent: 'flex-start',
                              textTransform: 'none',
                              bgcolor: '#1976d2',
                            }}
                          >
                            Enviar grupo: {group.description}
                          </Button>
                        ))
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          Nenhum grupo cadastrado.
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </>
            )}
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder={
                tabValue === 3 ? 'Digite a mensagem SMS...' : 'Digite o comando ou mensagem...'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              variant="outlined"
              disabled={sending}
              sx={{
                mb: 2.5,
                bgcolor: '#fff',
                '& .MuiOutlinedInput-root': { borderRadius: '10px' },
              }}
            />
          </>
        )}

        <Box
          display="flex"
          gap={1}
          mb={2}
          sx={{
            width: '100%',
            flexWrap: 'nowrap',
            '& .MuiButton-root': {
              borderRadius: '10px',
              boxShadow: 'none',
              width: '140px',
              minWidth: '140px',
              pointerEvents: 'auto',
            },
          }}
        >
          <Button
            variant="contained"
            startIcon={
              sendingType === 'GPRS' ? <CircularProgress size={18} color="inherit" /> : <SendIcon />
            }
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowSavedGroups(false);
              handleSend('GPRS');
            }}
            disabled={sendingType === 'GPRS'}

            sx={{
              flex: 1,
              minWidth: 0,
              py: 1.2,
              fontWeight: 'bold',
              bgcolor: '#1976d2',
              color: '#fff',
              '&:hover': { bgcolor: '#1565c0' },
            }}
          >
            GPRS
          </Button>
          <Button
            variant="contained"
            startIcon={
              sendingType === 'SMS' ? <CircularProgress size={18} color="inherit" /> : <SendIcon />
            }
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSend('SMS', tabValue === 3 ? avulsoPhone : '');
            }}
            disabled={sendingType === 'SMS'}

            sx={{
              flex: 1,
              minWidth: 0,
              py: 1.2,
              fontWeight: 'bold',
              bgcolor: '#ef6c00',
              color: '#fff',
              '&:hover': { bgcolor: '#e65100' },
            }}
          >
            SMS
          </Button>
        </Box>

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={1.5}
          pt={1}
          borderTop="1px solid #dbe7f5"
        >
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="subtitle2" fontWeight="bold" color="#1976d2">
              RELATÓRIO
            </Typography>
            <Paper
              sx={{
                px: 1,
                py: 0.1,
                bgcolor: '#1976d2',
                color: '#fff',
                fontSize: '11px',
                borderRadius: '10px',
                fontWeight: 'bold',
              }}
            >
              {reports.length}
            </Paper>
          </Box>
          <Typography
            variant="caption"
            color="error"
            sx={{ cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => setReports([])}
          >
            LIMPAR
          </Typography>
        </Box>

        <Box
          display="flex"
          flexDirection="column"
          gap={0.1}
          sx={{
            pb: 1,
            height: 230,
            maxHeight: 230,
            overflowY: 'auto',
            overflowX: 'hidden',
            pr: 1.5,
            flexShrink: 0,
            scrollbarGutter: 'stable',
          }}
        >
          {reports.map((rep) => {
            const success = isSuccessStatus(rep.status);
            const pending = isPendingStatus(rep.status);

            return (
              <Paper
                key={rep.id}
                variant="outlined"
                sx={{
                  p: 0.15,
                  mb: 0,
                  overflow: 'hidden',
                  boxShadow: 'none',
                  wordBreak: 'break-word',
                  '& .MuiTypography-root': { lineHeight: 0.9, fontSize: '8px' },
                  borderRadius: '8px',
                  borderColor: success ? '#a5d6a7' : pending ? '#90caf9' : '#ef9a9a',
                  bgcolor: success ? '#f1f8e9' : pending ? '#e3f2fd' : '#ffebee',
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.15}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {pending ? (
                      <CircularProgress size={14} thickness={5} color="primary" />
                    ) : success ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : (
                      <ErrorIcon color="error" fontSize="small" />
                    )}
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={success ? 'success.main' : pending ? 'primary.main' : 'error.main'}
                    >
                      {rep.status}
                    </Typography>
                    <Typography
                      variant="caption"
                      bgcolor="#e0e0e0"
                      px={1}
                      py={0.2}
                      borderRadius="4px"
                      fontWeight="bold"
                    >
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

                <Typography
                  variant="caption"
                  color="textSecondary"
                  display="flex"
                  alignItems="center"
                  gap={0.5}
                  mt={0}
                >
                  ?? {rep.deviceName} ({rep.phone})
                </Typography>

                {rep.smsMarketId && (
                  <Typography variant="caption" color="textSecondary" display="block" mt={0}>
                    ID SMSMarket: {rep.smsMarketId}
                  </Typography>
                )}

                {rep.responseCode && (
                  <Typography variant="caption" color="textSecondary" display="block" mt={0}>
                    C�digo: {rep.responseCode}
                  </Typography>
                )}

                {rep.error && (
                  <Typography variant="caption" color="error" display="block" mt={0}>
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

// atualizacao








