import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const nomeMes = [
  'Janeiro',
  'Fevereiro',
  'MarÃ§o',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const ContasPagarPage = ({ onClose, receber = 0 }) => {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [mesInicial, setMesInicial] = useState('2026-10');
  const [contas, setContas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mesFiltro, setMesFiltro] = useState('2026-10');

  const carregarContas = async () => {
    try {
      setCarregando(true);
      const res = await fetch('/api-contas-pagar/get.php');
      const data = await res.json();
      setContas(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarContas();
  }, []);

  const handleSalvar = async () => {
    const valor = parseFloat(valorTotal.replace(',', '.')) || 0;
    if (!descricao || valor <= 0) return alert('Preencha descriÃ§Ã£o e valor vÃ¡lido.');

    if (editId) {
      await fetch('/api-contas-pagar/update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, descricao, valor, vencimento: mesInicial }),
      });
    } else {
      const valorParcela = valor / parcelas;
      const [ano, mes] = mesInicial.split('-').map(Number);
      const novasContas = [];
      for (let i = 0; i < parcelas; i++) {
        const dataVenc = new Date(ano, mes - 1 + i, 1);
        const mesStr = String(dataVenc.getMonth() + 1).padStart(2, '0');
        novasContas.push({
          descricao: parcelas > 1 ? `${descricao} (${i + 1}/${parcelas})` : descricao,
          valor: valorParcela,
          vencimento: `${dataVenc.getFullYear()}-${mesStr}`,
        });
      }
      await fetch('/api-contas-pagar/create.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novasContas),
      });
    }
    setOpen(false);
    setEditId(null);
    setDescricao('');
    setValorTotal('');
    setParcelas(1);
    carregarContas();
  };

  const handleEditar = (c) => {
    setEditId(c.id);
    setDescricao(c.descricao);
    setValorTotal(c.valor.toString());
    setMesInicial(c.vencimento);
    setOpen(true);
  };

  const handleExcluir = async (id) => {
    if (window.confirm('Excluir esta conta?')) {
      await fetch(`/api-contas-pagar/delete.php?id=${id}`, { method: 'DELETE' });
      carregarContas();
    }
  };

  const handlePagar = async (id, pago) => {
    await fetch('/api-contas-pagar/pay.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pago: !pago }),
    });
    carregarContas();
  };

  const contasFiltradas = contas.filter((c) => c.vencimento === mesFiltro);
  const totalMes = contasFiltradas.reduce((s, c) => s + Number(c.valor || 0), 0);
  const saldoMes = receber - totalMes;

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f1f5f9', p: 3 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                backgroundColor: '#ffedd5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AddIcon sx={{ color: '#f59e0b', fontSize: 30 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                Contas a Pagar
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                Gerencie suas despesas fixas e parceladas.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right', mr: 3 }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              Saldo (receber - contas)
            </Typography>
            <Typography
              sx={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: saldoMes >= 0 ? '#16a34a' : '#dc2626',
              }}
            >
              {saldoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right', mr: 2 }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              Total do mÃªs
            </Typography>
            <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626' }}>
              {totalMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 150, mr: 2, backgroundColor: '#fff' }}>
              <Select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}>
                {['2026-10', '2026-11', '2026-12', '2027-01'].map((m) => {
                  const [a, me] = m.split('-');
                  return (
                    <MenuItem key={m} value={m}>
                      {nomeMes[Number(me) - 1]} {a}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditId(null);
                setDescricao('');
                setValorTotal('');
                setParcelas(1);
                setOpen(true);
              }}
              sx={{
                background: '#f59e0b',
                textTransform: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                px: 2.5,
                py: 1,
              }}
            >
              Nova Conta
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={onClose}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '10px',
                borderColor: '#e2e8f0',
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                px: 2.5,
                py: 1,
              }}
            >
              Voltar
            </Button>
          </Box>
        </Box>

        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: '16px', backgroundColor: '#fff', border: '1px solid #e2e8f0' }}
        >
          {carregando ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : contasFiltradas.length === 0 ? (
            <Typography sx={{ color: '#94a3b8', textAlign: 'center', py: 4 }}>
              Nenhuma conta neste mÃªs.
            </Typography>
          ) : (
            contasFiltradas.map((c) => (
              <Box
                key={c.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        color: '#1e293b',
                        textDecoration: c.pago ? 'line-through' : 'none',
                      }}
                    >
                      {c.descricao}
                    </Typography>
                    <Chip
                      label={c.pago ? 'Pago' : 'Pendente'}
                      color={c.pago ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                  <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Vencimento: {c.vencimento}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: '#dc2626' }}>
                    R$ {Number(c.valor).toFixed(2).replace('.', ',')}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handlePagar(c.id, c.pago)}
                    title="Dar Baixa"
                  >
                    <CheckCircleIcon color={c.pago ? 'success' : 'action'} />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleEditar(c)} title="Editar">
                    <EditIcon color="primary" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleExcluir(c.id)} title="Excluir">
                    <DeleteIcon color="error" />
                  </IconButton>
                </Box>
              </Box>
            ))
          )}
        </Paper>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editId ? 'Editar Conta' : 'Cadastrar Nova Conta'}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="DescriÃ§Ã£o"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Valor Total (R$)"
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            sx={{ mb: 2 }}
          />
          {!editId && (
            <TextField
              fullWidth
              type="number"
              label="Parcelas"
              value={parcelas}
              onChange={(e) => setParcelas(Number(e.target.value))}
              sx={{ mb: 2 }}
            />
          )}
          <TextField
            fullWidth
            type="date"
            label="Data de Vencimento"
            value={mesInicial}
            onChange={(e) => setMesInicial(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: '#64748b' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSalvar}
            sx={{ background: '#f59e0b', '&:hover': { background: '#d97706' } }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContasPagarPage;
