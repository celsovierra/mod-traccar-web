import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, Box, Typography, IconButton, Tabs, Tab, TextField, Button, Paper, Collapse } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import EditIcon from '@mui/icons-material/Edit';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Error from '@mui/icons-material/Error';
import SettingsIcon from '@mui/icons-material/Settings';
import { getCredentials, saveCredentials, getBalance, sendSms } from './smsMarketService';

const SmsMarketModal = ({ device, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const [message, setMessage] = useState('');
  const [balance, setBalance] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [creds, setCreds] = useState(getCredentials());
  const [reports, setReports] = useState([]);
  const phone = device?.phone || '';

  useEffect(() => {
    getBalance().then(setBalance);
  }, []);

  const handleSaveCreds = async () => {
    try {
      const newBalance = await saveCredentials(creds);
      setShowSettings(false);
      setBalance(newBalance);
      alert('Credenciais salvas e testadas com sucesso!');
    } catch (err) {
      alert(err.message || 'Erro ao validar credenciais.');
    }
  };

  const handleSend = async (type) => {
    if (!creds.user || !creds.pass) {
      alert('Configure o login e a senha do SMS Market na engrenagem!');
      setShowSettings(true);
      return;
    }
    if (!phone) {
      alert('Veículo sem número de telefone cadastrado!');
      return;
    }
    try {
      const res = await sendSms(phone, message);
      setReports(prev => [
        {
          id: Date.now(),
          status: 'ENTREGUE',
          type: type,
          time: res.time,
          text: message || 'Comando padrão',
          phone: phone,
          deviceName: device?.name
        },
        ...prev
      ]);
      setMessage('');
      getBalance().then(setBalance);
    } catch (err) {
      setReports(prev => [
        {
          id: Date.now(),
          status: 'FALHA',
          type: type,
          time: new Date().toLocaleTimeString(),
          text: message || 'Comando padrão',
          phone: phone,
          deviceName: device?.name
        },
        ...prev
      ]);
      alert(err.message);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth='sm' fullWidth PaperProps={{ sx: { borderRadius: '16px', p: { xs: 1, sm: 2 }, m: { xs: 1, sm: 2 }, maxHeight: '90vh' } }}>
      <Box display='flex' justifyContent='space-between' alignItems='center' px={1} pt={1}>
        <Box display='flex' alignItems='center' gap={1}>
          <FlashOnIcon color='primary' />
          <Typography variant='h6' fontWeight='bold' color='#1976d2' sx={{ fontSize: { xs: '16px', sm: '20px' } }}>SMS MARKET</Typography>
        </Box>
        <Box display='flex' alignItems='center' gap={1}>
          <Paper variant='outlined' sx={{ px: 1.5, py: 0.3, bgcolor: '#e3f2fd', borderColor: '#90caf9', borderRadius: '8px' }}>
            <Typography variant='body2' color={balance === 'Configure login' ? 'error' : 'primary'} fontWeight='bold'>SMS: {balance}</Typography>
          </Paper>
          <IconButton onClick={() => setShowSettings(!showSettings)} size='small' color='primary'><SettingsIcon /></IconButton>
          <IconButton onClick={onClose} size='small'><CloseIcon /></IconButton>
        </Box>
      </Box>
      <Collapse in={showSettings}>
        <Box p={2} mb={2} bgcolor='#f1f8e9' borderRadius='8px' border='1px solid #c8e6c9'>
          <Typography variant='subtitle2' fontWeight='bold' color='success.dark' mb={1}>Configurar Credenciais SMS Market</Typography>
          <TextField size='small' fullWidth label='Usuário / Login' value={creds.user} onChange={e => setCreds({...creds, user: e.target.value})} sx={{ mb: 1, bgcolor: '#fff' }} />
          <TextField size='small' fullWidth type='password' label='Senha' value={creds.pass} onChange={e => setCreds({...creds, pass: e.target.value})} sx={{ mb: 1, bgcolor: '#fff' }} />
          <Button variant='contained' size='small' color='success' onClick={handleSaveCreds} fullWidth>Salvar Credenciais</Button>
        </Box>
      </Collapse>
      <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} variant='fullWidth' sx={{ borderBottom: 1, borderColor: 'divider', px: 1, pt: 1, '& .MuiTab-root': { textTransform: 'none', fontWeight: 'bold', fontSize: { xs: '11px', sm: '13px' }, minWidth: 'auto', px: 1 } }}>
        <Tab icon={<EditIcon />} label='Personalizado' iconPosition='top' />
        <Tab icon={<FlashOnIcon />} label='Cmd Pronto' iconPosition='top' />
        <Tab icon={<Inventory2Icon />} label='Grupo' iconPosition='top' />
        <Tab icon={<SmartphoneIcon />} label='SMS Avulso' iconPosition='top' />
      </Tabs>
      <DialogContent sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
        <Box mb={2} p={1.5} bgcolor='#f8f9fa' borderRadius='8px' border='1px solid #e0e0e0' display='flex' justifyContent='space-between' alignItems='center'>
          <Typography variant='body2' color='textSecondary' fontWeight='medium'>Tel: {phone || 'Não cadastrado'}</Typography>
          <Typography variant='caption' fontWeight='bold' color={phone ? 'primary.main' : 'error.main'}>{phone ? 'Disponível' : 'Cadastre no veículo'}</Typography>
        </Box>
        <TextField fullWidth multiline rows={3} placeholder='Digite o comando ou mensagem...' value={message} onChange={(e) => setMessage(e.target.value)} variant='outlined' sx={{ mb: 2, bgcolor: '#f8f9fa' }} />
        <Box display='flex' gap={1.5} mb={3}>
          <Button variant='contained' startIcon={<SendIcon />} onClick={() => handleSend('GPRS')} fullWidth sx={{ py: 1.2, fontWeight: 'bold', fontSize: { xs: '12px', sm: '14px' }, bgcolor: '#90caf9', color: '#fff', '&:hover': { bgcolor: '#64b5f6' } }}>GPRS</Button>
          <Button variant='contained' startIcon={<SendIcon />} onClick={() => handleSend('SMS')} fullWidth sx={{ py: 1.2, fontWeight: 'bold', fontSize: { xs: '12px', sm: '14px' }, bgcolor: '#ffe0b2', color: '#e65100', '&:hover': { bgcolor: '#ffe0b2' } }}>SMS</Button>
        </Box>
        <Box display='flex' justifyContent='space-between' alignItems='center' mb={1}>
          <Box display='flex' alignItems='center' gap={1}>
            <Typography variant='subtitle2' fontWeight='bold' color='#1976d2'>RELATÓRIO</Typography>
            <Paper sx={{ px: 1, py: 0.1, bgcolor: '#1976d2', color: '#fff', fontSize: '11px', borderRadius: '10px', fontWeight: 'bold' }}>{reports.length}</Paper>
          </Box>
          <Typography variant='caption' color='error' sx={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setReports([])}>LIMPAR</Typography>
        </Box>
        <Box display='flex' flexDirection='column' gap={1.5}>
          {reports.map(rep => (
            <Paper key={rep.id} variant='outlined' sx={{ p: 2, borderRadius: '12px', borderColor: rep.status === 'ENTREGUE' ? '#a5d6a7' : '#ef9a9a', bgcolor: rep.status === 'ENTREGUE' ? '#f1f8e9' : '#ffebee' }}>
              <Box display='flex' justifyContent='space-between' alignItems='center' mb={0.5}>
                <Box display='flex' alignItems='center' gap={1}>
                  {rep.status === 'ENTREGUE' ? <CheckCircle color='success' fontSize='small' /> : <Error color='error' fontSize='small' />}
                  <Typography variant='body2' fontWeight='bold' color={rep.status === 'ENTREGUE' ? 'success.main' : 'error.main'}>{rep.status}</Typography>
                  <Typography variant='caption' bgcolor='#e0e0e0' px={1} py={0.2} borderRadius='4px' fontWeight='bold'>{rep.type}</Typography>
                </Box>
                <Typography variant='caption' color='textSecondary'>{rep.time}</Typography>
              </Box>
              <Typography variant='body2' fontFamily='monospace' fontWeight='bold'>{rep.text}</Typography>
              <Typography variant='caption' color='textSecondary' display='flex' alignItems='center' gap={0.5} mt={0.5}>🚗 {rep.deviceName} ({rep.phone})</Typography>
            </Paper>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SmsMarketModal;