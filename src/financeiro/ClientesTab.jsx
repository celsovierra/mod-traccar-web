import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Table, TableRow, TableCell, TableHead, TableBody, Box, Paper, Typography, Avatar, TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, MenuItem } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { useAsyncTask, useScrollToLoad, pageSize } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import TableShimmer from '../common/components/TableShimmer';
import SearchHeader from '../settings/components/SearchHeader';
import fetchOrThrow from '../common/util/fetchOrThrow';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

const ClientesTab = () => {
  const t = useTranslation();
  const [reloadKey, reload] = useReducer((k) => k + 1, 0);
  const [items, setItems] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [editando, setEditando] = useState({});
  const [rascunho, setRascunho] = useState({});
  const [modalBaixa, setModalBaixa] = useState(null);
  const [mesesBaixa, setMesesBaixa] = useState(1);
  const [salvandoBaixa, setSalvandoBaixa] = useState(false);
  const abrirBaixa = (item) => { setModalBaixa(item); setMesesBaixa(1); };
  const calcNovoVencimento = (vencStr, meses) => {
    if (!vencStr) return null;
    const parts = vencStr.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setMonth(d.getMonth() + meses);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  };
  const formatarDataBR = (iso) => {
    if (!iso) return '-';
    const parts = iso.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  };
  const confirmarBaixa = async () => {
    if (!modalBaixa) return;
    setSalvandoBaixa(true);
    try {
      const vencAtual = modalBaixa.attributes?.fin_vencimento || '';
      const novoVenc = calcNovoVencimento(vencAtual, mesesBaixa);
      const attrs = { ...(modalBaixa.attributes || {}), fin_vencimento: novoVenc };
      await fetchOrThrow('/api/users/' + modalBaixa.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: modalBaixa.id, name: modalBaixa.name || '-', email: modalBaixa.email || modalBaixa.name || 'sem@local', attributes: attrs }),
      });
      setItems((prev) => prev.map((u) => u.id === modalBaixa.id ? { ...u, attributes: attrs } : u));
      setModalBaixa(null);
    } catch (e) { console.error(e); alert('Erro ao salvar'); }
    finally { setSalvandoBaixa(false); }
  };
  const valorTotal = (item, meses) => {
    const v = (item.attributes?.fin_valor || '0').replace(',', '.');
    const n = parseFloat(v) || 0;
    return (n * meses).toFixed(2).replace('.', ',');
  };

  const salvarTudo = async () => {
    try {
      const attrs = { ...userAttributes, fin_msg_recibo: reciboTexto };
      await fetchOrThrow('/api/users/' + userId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, name: userAttributes.name || '-', email: userAttributes.email || (userAttributes.name || 'sem') + '@local', attributes: attrs }),
      });
      alert('Salvo!')
    } catch (e) { console.error(e); alert('Erro ao salvar'); }
  };

  const iniciarEdicao = (item) => {
    setEditando((e) => ({ ...e, [item.id]: true }));
    setRascunho((r) => ({
      ...r,
      [item.id]: {
        telefone1: item.attributes?.fin_telefone1 || '',
        telefone2: item.attributes?.fin_telefone2 || '',
        valor: item.attributes?.fin_valor || '',
        vencimento: item.attributes?.fin_vencimento || '',
        contrato: item.attributes?.fin_contrato || '',
      },
    }));
  };

  const salvar = async (item) => {
    const d = rascunho[item.id];
    const attrs = {
      ...(item.attributes || {}),
      fin_telefone1: d.telefone1,
      fin_telefone2: d.telefone2,
      fin_valor: d.valor,
      fin_vencimento: d.vencimento,
      fin_contrato: d.contrato,
    };
    try {
      await fetchOrThrow('/api/users/' + item.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, name: item.name || '-', email: item.email || item.name || 'sem@email.com', attributes: attrs }),
      });
      setItems((prev) => prev.map((u) => u.id === item.id ? { ...u, attributes: attrs } : u));
      setEditando((e) => ({ ...e, [item.id]: false }));
    } catch (err) {
      console.error(err);
    }
  };

  const loadItems = useCallback(async (offset, signal) => {
    const limit = offset === 0 ? 30 : pageSize;
    const query = new URLSearchParams({ excludeAttributes: true, limit, offset });
    const response = await fetchOrThrow('/api/users?' + query.toString(), { signal });
    const data = await response.json();
    setItems((previous) => {
      const combined = offset ? [...previous, ...data] : data;
      const uniqueMap = new Map();
      combined.forEach((u) => uniqueMap.set(u.id, u));
      return Array.from(uniqueMap.values());
    });
    setHasMore(data.length >= limit);
  }, []);


  const searchTimeoutRef = useRef(null);
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      const keyword = searchKeyword.trim();
      if (keyword) {
        try {
          const q = new URLSearchParams({ excludeAttributes: true, limit: 5000, offset: 0 });
          const r = await fetchOrThrow('/api/users?' + q.toString());
          const d = await r.json();
          setItems(d);
          setHasMore(false);
        } catch (e) { }
      } else { reload(); }
    }, 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchKeyword]);
  const sentinelRef = useScrollToLoad(() => loadItems(items.length));
  useAsyncTask(
    async ({ signal }) => {
      void reloadKey;
      setItems([]);
      await loadItems(0, signal);
    },
    [reloadKey, loadItems],
  );

  const filteredItems = items.filter((u) => !u.temporary).filter((u) => {
    if (!searchKeyword) return true;
    const k = searchKeyword.toLowerCase();
    return (u.name && u.name.toLowerCase().includes(k)) || (u.email && u.email.toLowerCase().includes(k));
  });

  const getAvatarIcon = (item) => {
    if (item.administrator) return <AdminPanelSettingsIcon sx={{ fontSize: 18 }} />;
    if (item.userLimit) return <SupervisorAccountIcon sx={{ fontSize: 18 }} />;
    return <PersonIcon sx={{ fontSize: 18 }} />;
  };

  const getAvatarColor = (item) => {
    if (item.administrator) return { bg: '#fee2e2', color: '#dc2626' };
    if (item.userLimit) return { bg: '#fef3c7', color: '#d97706' };
    return { bg: '#ede9fe', color: '#7c3aed' };
  };

  const headCell = { fontWeight: 800, color: '#475569', fontSize: '0.82rem', py: 1.8, whiteSpace: 'nowrap' };
  const bodyCell = { py: 1.6, color: '#64748b', fontSize: '0.86rem' };
  const formatarTelefone = (v) => {
    const nums = (v || '').replace(/\D/g, '');
    if (!nums) return '55';
    return nums.startsWith('55') ? nums : '55' + nums;
  };

  const formatarValor = (v) => {
    const nums = (v || '').replace(/[^\d]/g, '');
    if (!nums) return '';
    const n = parseInt(nums, 10);
    const inteiros = Math.floor(n / 100);
    const centavos = String(n % 100).padStart(2, '0');
    return inteiros + ',' + centavos;
  };


  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', maxWidth: 1200, mx: 'auto', px: { xs: 1.5, sm: 3 }, boxSizing: 'border-box' }}>
        <Box sx={{ flexShrink: 0, backgroundColor: '#ffffff', pt: { xs: 1.5, sm: 2 }, pb: 1, zIndex: 10 }}>
          <SearchHeader keyword={searchKeyword} setKeyword={setSearchKeyword} />
        </Box>
        <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: 8 }}>
          <Paper elevation={0} sx={{ borderRadius: '24px', border: '1px solid #edf2f7', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)', overflow: 'hidden', backgroundColor: '#ffffff' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={headCell}>{t('sharedName')}</TableCell>
                    <TableCell sx={headCell}>Telefone 1</TableCell>
                    <TableCell sx={headCell}>Telefone 2</TableCell>
                    <TableCell sx={headCell}>Valor</TableCell>
                    <TableCell sx={headCell}>Vencimento</TableCell>
                    <TableCell sx={headCell}>Contrato</TableCell>
                    <TableCell sx={{ ...headCell, textAlign: 'right' }}>Acoes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((item) => {
                    const avatarStyle = getAvatarColor(item);
                    return (
                      <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ py: 1.6 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 34, height: 34, backgroundColor: avatarStyle.bg, color: avatarStyle.color }}>
                              {getAvatarIcon(item)}
                            </Avatar>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                              {item.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={bodyCell}>
                          {editando[item.id] ? (
                            <TextField size='small' value={rascunho[item.id]?.telefone1 || ''} onChange={(e) => setRascunho((r) => ({ ...r, [item.id]: { ...r[item.id], telefone1: formatarTelefone(e.target.value) } }))} />
                          ) : (
                            <span>{item.attributes?.fin_telefone1 || '-'}</span>
                          )}
                        </TableCell>
                        <TableCell sx={bodyCell}>
                          {editando[item.id] ? (
                            <TextField size='small' value={rascunho[item.id]?.telefone2 || ''} onChange={(e) => setRascunho((r) => ({ ...r, [item.id]: { ...r[item.id], telefone2: formatarTelefone(e.target.value) } }))} />
                          ) : (
                            <span>{item.attributes?.fin_telefone2 || '-'}</span>
                          )}
                        </TableCell>
                        <TableCell sx={bodyCell}>
                          {editando[item.id] ? (
                            <TextField size='small' placeholder='12,00' value={rascunho[item.id]?.valor || ''} onChange={(e) => setRascunho((r) => ({ ...r, [item.id]: { ...r[item.id], valor: formatarValor(e.target.value) } }))} />
                          ) : (
                            <span>{item.attributes?.fin_valor || '-'}</span>
                          )}
                        </TableCell>
                        <TableCell sx={bodyCell}>
                          {editando[item.id] ? (
                            <TextField size='small' type='date' value={rascunho[item.id]?.vencimento || ''} onChange={(e) => setRascunho((r) => ({ ...r, [item.id]: { ...r[item.id], vencimento: e.target.value } }))} />
                          ) : (
                            <span>{item.attributes?.fin_vencimento || '-'}</span>
                          )}
                        </TableCell>
                        <TableCell sx={bodyCell}>
                          {editando[item.id] ? (
                            <TextField size='small' value={rascunho[item.id]?.contrato || ''} onChange={(e) => setRascunho((r) => ({ ...r, [item.id]: { ...r[item.id], contrato: e.target.value } }))} />
                          ) : (
                            <span>{item.attributes?.fin_contrato || '-'}</span>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1.6, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {editando[item.id] ? (
                            <IconButton size='small' color='primary' onClick={() => salvar(item)}><SaveIcon fontSize='small' /></IconButton>
                          ) : (
                            <>
                              <IconButton size='small' onClick={() => {}} title='Cobrança'><DescriptionIcon fontSize='small' sx={{ color: '#f97316' }} /></IconButton>
                              <IconButton size='small' onClick={() => {}} title='WhatsApp'><ChatBubbleIcon fontSize='small' sx={{ color: '#22c55e' }} /></IconButton>
                              <IconButton size='small' onClick={() => abrirBaixa(item)} title='Confirmar Pagamento'><CheckCircleIcon fontSize='small' sx={{ color: '#3b82f6' }} /></IconButton>
                              <IconButton size='small' onClick={() => iniciarEdicao(item)} title='Editar'><EditIcon fontSize='small' /></IconButton>
                              <IconButton size='small' onClick={() => {}} title='Excluir'><DeleteIcon fontSize='small' sx={{ color: '#dc2626' }} /></IconButton>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {hasMore && (
                    <TableShimmer ref={items.length > 0 ? sentinelRef : null} columns={7} endAction />
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Box>

      <Dialog open={!!modalBaixa} onClose={() => setModalBaixa(null)} maxWidth='xs' fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Baixa Manual - {modalBaixa?.name}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.85rem', color: '#64748b', mb: 0.5 }}>Vencimento atual: {formatarDataBR(modalBaixa?.attributes?.fin_vencimento)}</Typography>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mt: 2, mb: 0.5 }}>Quantos meses dar baixa?</Typography>
          <TextField select fullWidth size='small' value={mesesBaixa} onChange={(e) => setMesesBaixa(Number(e.target.value))}>
            {[...Array(12)].map((_, i) => (
              <MenuItem key={i+1} value={i+1}>{i+1} {i+1 === 1 ? 'mês' : 'meses'}</MenuItem>
            ))}
          </TextField>
          <Typography sx={{ fontSize: '0.85rem', color: '#64748b', mt: 2 }}>Novo vencimento: <strong>{formatarDataBR(calcNovoVencimento(modalBaixa?.attributes?.fin_vencimento, mesesBaixa))}</strong></Typography>
          <Typography sx={{ fontSize: '0.85rem', color: '#64748b', mt: 1 }}>Valor total da baixa: <strong>R$ {valorTotal(modalBaixa || {}, mesesBaixa)}</strong></Typography>
          <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8', mt: 2 }}>Após confirmar, um recibo será enviado via WhatsApp.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setModalBaixa(null)} sx={{ textTransform: 'none', color: '#475569' }}>Cancelar</Button>
          <Button onClick={confirmarBaixa} disabled={salvandoBaixa} variant='contained' sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#2563eb', borderRadius: '8px' }}>Confirmar Baixa</Button>
        </DialogActions>
      </Dialog>
      </Box>
    </>
  );
};

export default ClientesTab;
