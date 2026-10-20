import { useState, useEffect } from 'react';
import { getMessageStatus, getBalance, sendSms } from '../smsMarket/smsMarketService';

const normalizeBrazilPhone = (phone) => {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11 || digits.length === 10) return '55' + digits;
  return digits;
};
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Typography, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';

const ManutencaoPage = () => {
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  
  const navigate = useNavigate();
  const [lista, setLista] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState('');
  const [commandList, setCommandList] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState({});
  const [smsIds, setSmsIds] = useState({});
  const [saldo, setSaldo] = useState('...');
  const user = useSelector((state) => state.session.user);
  const admin = useSelector((state) => state.session.user); // Apenas para ter acesso
  
  useEffect(() => {
    getBalance()
      .then(data => { if (data !== null && data !== undefined) setSaldo(data); })
      .catch(() => setSaldo('Erro'));
  }, []); // { [deviceId]: 'sending' | 'success' | 'error' }
  
  const handleSendCommand = async () => {
    if (!selectedCommand) return alert('Escolha um comando primeiro!');
    if (selectedIds.length === 0) return alert('Selecione pelo menos um veiculo!');
    if (!window.confirm('Enviar SMS para ' + selectedIds.length + ' veiculos?')) return;
    
    setSending(true);
    const newStatus = {};
    selectedIds.forEach(id => { newStatus[id] = 'sending'; });
    setSendStatus(prev => ({ ...prev, ...newStatus }));

    await Promise.all(selectedIds.map(async (deviceId) => {
      const device = devices[deviceId];
      let phone = device?.phone || device?.attributes?.phone;
      
      // Se nao tiver no veiculo, procura no usuario dono (igual o Financeiro faz)
      if (!phone && device?.attributes?.user) {
        const owner = users[device.attributes.user];
        if (owner && owner.attributes) {
          phone = owner.attributes.fin_telefone1 || owner.attributes.phone;
        }
      }
      
      if (!phone) {
        setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
        return;
      }

      try {
        const normalizedPhone = normalizeBrazilPhone(phone);
        const res = await sendSms(normalizedPhone, selectedCommand);
        const msgId = res?.id || res?.smsMarketId || res?.responseCode;
        if (msgId && msgId !== '000') {
            setSmsIds(prev => ({ ...prev, [deviceId]: msgId }));
            setSendStatus(prev => ({ ...prev, [deviceId]: 'sent' }));
        } else {
            setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
        }
      } catch (e) {
        setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
      }
    }));

    setSelectedIds([]);
    setSelectedCommand('');
    setSending(false);
    getBalance().then(data => setSaldo(data));
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const idsToCheck = Object.keys(smsIds);
      if (idsToCheck.length === 0) return;

      for (const deviceId of idsToCheck) {
        const smsId = smsIds[deviceId];
        if (!smsId) continue;
        
        try {
          const res = await getMessageStatus({ id: smsId });
          if (res && res.statusInfo) {
            const statusLabel = res.status || (res.data && res.data.status) || ''; // Retorna 'ENTREGUE', 'FALHA', etc.
            
            if (statusLabel === 'ENTREGUE') {
              setSendStatus(prev => ({ ...prev, [deviceId]: 'success' }));
              setSmsIds(prev => { const n = {...prev}; delete n[deviceId]; return n; });
            } else if (statusLabel < '0' || statusLabel === 'FALHA' || statusLabel === 'ERRO') {
              setSendStatus(prev => ({ ...prev, [deviceId]: 'error' }));
              setSmsIds(prev => { const n = {...prev}; delete n[deviceId]; return n; });
            }
          }
        } catch (e) {
          console.error('Erro ao checar SMS', e);
        }
      }
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [smsIds]);

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedIds(lista.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    fetch('/api/commands', { credentials: 'same-origin' })
      .then(res => res.json())
      .then(data => setCommandList(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const result = [];
    const now = Date.now();

    Object.values(devices).forEach((device) => {
      const pos = positions[device.id];
      let isOnline = device.status === 'online';
      
      if (!isOnline && pos && pos.fixTime) {
        const diffMin = (now - new Date(pos.fixTime).getTime()) / 60000;
        if (diffMin <= 15) isOnline = true;
      }

      if (!isOnline) {
        const lastTime = pos?.fixTime || device.lastUpdate;
        const diffDays = lastTime ? Math.floor((now - new Date(lastTime).getTime()) / (1000 * 60 * 60 * 24)) : 'Sem data';
        
        if (diffDays === 'Sem data' || diffDays >= 1) {
          result.push({ ...device, diasOffline: diffDays });
        }
      }
    });

    setLista(result);
  }, [devices, positions]);

  return (
    <Box sx={{ p: 4, maxWidth: 900, margin: '0 auto' }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/')} 
        sx={{ mb: 2, textTransform: 'none', fontWeight: 600, color: '#7c3aed' }}
      >
        Voltar para o Mapa
      </Button>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/settings/commands')} 
          sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#7c3aed', color: '#7c3aed' }}
        >
          Gerenciar Comandos
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
            Manutenção de Veículos (Filtro: Offline)
          </Typography>
          <Box sx={{ 
            backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', 
            borderRadius: '8px', px: 2, py: 0.5, color: '#1d4ed8', 
            fontWeight: 700, fontSize: '0.9rem' 
          }}>
            SMS: {saldo}
          </Box>
        </Box>
        {selectedIds.length > 0 && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Comando</InputLabel>
              <Select
                value={selectedCommand}
                onChange={(e) => setSelectedCommand(e.target.value)}
                label="Comando"
              >
                {commandList.map(cmd => (
                  <MenuItem key={cmd.id} value={cmd.type}>{cmd.description || cmd.type}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSendCommand}
              disabled={sending || !selectedCommand}
              sx={{ backgroundColor: '#3b82f6', textTransform: 'none', fontWeight: 700 }}
            >
              {sending ? 'Enviando...' : 'Enviar'}
            </Button>
          </Box>
        )}
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={selectedIds.length > 0 && selectedIds.length < lista.length}
                checked={lista.length > 0 && selectedIds.length === lista.length}
                onChange={handleSelectAll}
              />
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Veículo</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status Offline</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Envio SMS</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lista.map((item) => (
            <TableRow key={item.id} selected={selectedIds.includes(item.id)} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9fafb' } }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedIds.includes(item.id)}
                  onChange={() => handleSelect(item.id)}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
              
              <TableCell sx={{ color: '#ef4444', fontWeight: 700 }}>
                Offline há {item.diasOffline} dia(s)
              </TableCell>
              <TableCell>
                {sendStatus[item.id] === 'sending' && <span style={{ color: '#d97706', fontWeight: 'bold' }}>Enviando...</span>}
                {sendStatus[item.id] === 'success' && <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Enviado (OK)</span>}
                {sendStatus[item.id] === 'error' && <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Falha</span>}
                {!sendStatus[item.id] && <span style={{ color: '#9ca3af' }}>-</span>}
              </TableCell>
            </TableRow>
          ))}
          {lista.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} align="center" sx={{ py: 4, color: '#6b7280' }}>
                Nenhum veículo encontrado com essa regra.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    
    </Box>
  );
};

export default ManutencaoPage;


