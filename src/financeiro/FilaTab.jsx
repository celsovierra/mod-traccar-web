import { useState, useEffect, useCallback } from 'react';
import { Table, TableRow, TableCell, TableHead, TableBody, Box, Paper, Typography, Chip, Button, CircularProgress, Select, MenuItem, FormControl, InputLabel, TextField } from '@mui/material';
import { useSelector } from 'react-redux';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const FilaTab = () => {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [filtro, setFiltro] = useState('Todos');
  const [intervalo, setIntervalo] = useState(10);
  const [unidade, setUnidade] = useState('s');
  const user = useSelector((state) => state.session.user);
  const userAttributes = user.attributes || {};
  const headCell = { fontWeight: 800, color: '#475569', fontSize: '0.82rem', py: 1.8, whiteSpace: 'nowrap' };
  const bodyCell = { py: 1.6, color: '#64748b', fontSize: '0.86rem' };

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch('/api-financeiro/fila');
      const d = await r.json();
      setItens(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); setItens([]); }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const iv = userAttributes.fin_fila_intervalo || '10s';
    const m = iv.match(/^(\d+)([smh])$/);
    if (m) { setIntervalo(Number(m[1])); setUnidade(m[2]); }
  }, []);

  const salvarIntervalo = async (valor, un) => {
    try {
      const attrs = { ...userAttributes, fin_fila_intervalo: valor + un };
      await fetch('/api/users/' + user.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, name: user.name || '-', email: user.email || 'sem@local', attributes: attrs }),
      });
    } catch (e) { console.error(e); }
  };

  const chamar = async (rota) => {
    try {
      await fetch('/api-financeiro/' + rota, { method: 'POST' });
      setTimeout(carregar, 1500);
    } catch (e) { console.error(e); }
  };

  const filtrados = filtro === 'Todos' ? itens : itens.filter((i) => i.tipo === filtro);
  const total = filtrados.reduce((s, i) => {
    const v = (i.valor || '0').toString().replace('.', '').replace(',', '.');
    return s + (parseFloat(v) || 0);
  }, 0);

  const corStatus = (s) => s === 'Enviado' ? 'success' : s === 'Erro' ? 'error' : 'warning';

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
        <FormControl size='small' sx={{ minWidth: 160 }}>
          <InputLabel>Filtro</InputLabel>
          <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} label='Filtro'>
            <MenuItem value='Todos'>Todos</MenuItem>
            <MenuItem value='Lembrete'>Lembrete</MenuItem>
            <MenuItem value='Vencimento'>Vencimento</MenuItem>
            <MenuItem value='Atraso'>Atraso</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography sx={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Intervalo entre envios:</Typography>
          <TextField type='number' size='small' value={intervalo} onChange={(e) => { const v = Number(e.target.value) || 1; setIntervalo(v); salvarIntervalo(v, unidade); }} sx={{ width: 80 }} />
          <TextField select size='small' value={unidade} onChange={(e) => { setUnidade(e.target.value); salvarIntervalo(intervalo, e.target.value); }} sx={{ width: 110 }}>
            <MenuItem value='s'>segundos</MenuItem>
            <MenuItem value='m'>minutos</MenuItem>
            <MenuItem value='h'>horas</MenuItem>
          </TextField>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Chip label={'Total: R$ ' + total.toFixed(2).replace('.', ',')} sx={{ backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 700 }} />
        <Button variant='outlined' startIcon={<RefreshIcon />} onClick={carregar} sx={{ textTransform: 'none', fontWeight: 700 }}>Atualizar</Button>
        <Button variant='outlined' startIcon={<CloudUploadIcon />} onClick={() => chamar('popular')} sx={{ textTransform: 'none', fontWeight: 700 }}>Popular Fila</Button>
        <Button variant='outlined' color='error' startIcon={<DeleteIcon />} onClick={() => chamar('limpar')} sx={{ textTransform: 'none', fontWeight: 700 }}>Limpar</Button>
        <Button variant='contained' startIcon={<PlayArrowIcon />} onClick={() => chamar('processar')} sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#2563eb' }}>Processar</Button>
      </Box>
      <Paper elevation={0} sx={{ borderRadius: '24px', border: '1px solid #edf2f7', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)', overflow: 'hidden', backgroundColor: '#ffffff' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={headCell}>Cliente</TableCell>
                <TableCell sx={headCell}>Tipo</TableCell>
                <TableCell sx={headCell}>Valor</TableCell>
                <TableCell sx={headCell}>Vencimento</TableCell>
                <TableCell sx={headCell}>Dias de Atraso</TableCell>
                <TableCell sx={headCell}>Enviado em</TableCell>
                <TableCell sx={headCell}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {carregando && (
                <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
              )}
              {!carregando && filtrados.length === 0 && (
                <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>Nenhum cliente na fila</TableCell></TableRow>
              )}
              {filtrados.map((i) => (
                <TableRow key={i.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ py: 1.4 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>{i.nome}</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{i.telefone}</Typography>
                  </TableCell>
                  <TableCell sx={bodyCell}><Chip label={i.tipo} size='small' sx={{ fontSize: '0.7rem', fontWeight: 700 }} /></TableCell>
                  <TableCell sx={bodyCell}>R$ {i.valor}</TableCell>
                  <TableCell sx={bodyCell}>{i.vencimento}</TableCell>
                  <TableCell sx={bodyCell}>{i.dias_atraso}</TableCell>
                  <TableCell sx={bodyCell}>{i.enviado_em || '-'}</TableCell>
                  <TableCell sx={bodyCell}><Chip label={i.status} size='small' color={corStatus(i.status)} sx={{ fontSize: '0.7rem', fontWeight: 700 }} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Box>
  );
};

export default FilaTab;
