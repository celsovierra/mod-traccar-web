import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, CircularProgress, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useSelector } from 'react-redux';

const fmtBR = (n) => Number(n || 0).toFixed(2).replace('.', ',');

const CORES_DIA = ['#ef4444', '#3b82f6', '#a855f7', '#22c55e', '#f97316', '#06b6d4', '#ec4899', '#eab308'];
const nomeMes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const DashboardTab = ({ onClose }) => {
  const [items, setItems] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [diaAberto, setDiaAberto] = useState(null);

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const [mesSel, setMesSel] = useState(hoje.getMonth());
  const [anoSel, setAnoSel] = useState(hoje.getFullYear());

  useEffect(() => {
    const carregar = async () => {
      try {
        const r = await fetchOrThrow('/api/users?limit=5000&offset=0');
        const d = await r.json();
        setItems(d.filter((u) => !u.temporary));
      } catch (e) { console.error(e); }
      finally { setCarregando(false); }
    };
    carregar();
  }, []);

  const userAttributes = useSelector((state) => state.session.user.attributes) || {};
  const multaValor = parseFloat((userAttributes.fin_multa_valor || '0').replace(',', '.')) || 0;
  const jurosDia = parseFloat((userAttributes.fin_juros_valor || '0').replace(',', '.')) || 0;
  const multaAtiva = (userAttributes.fin_multa_ativo !== 'false');

  const clientes = items.filter((u) => u.attributes?.fin_vencimento && u.attributes?.fin_valor && u.attributes?.fin_nao_cobrar !== 'true');

  const mesesOpcoes = [];
  for (let i = 0; i <= 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    mesesOpcoes.push({ mes: d.getMonth(), ano: d.getFullYear(), label: nomeMes[d.getMonth()] + ' ' + d.getFullYear() });
  }

  let totalAtraso = 0, qtdAtraso = 0;
  let totalMes = 0, qtdMes = 0;
  const porDia = {};
  const listaAtraso = [];

  clientes.forEach((c) => {
    const vencStr = c.attributes.fin_vencimento;
    const parts = vencStr.split('-');
    const venc = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    venc.setHours(0,0,0,0);
    const valor = parseFloat((c.attributes.fin_valor || '0').replace(',', '.')) || 0;
    const diff = Math.round((venc - hoje) / 86400000);
    if (diff < 0) {

      const diasAtraso = Math.abs(diff);
      // Calcula quantos meses estao em atraso (mensalidades vencidas)
      const hojeMes = hoje.getMonth();
      const hojeAno = hoje.getFullYear();
      let mesesAtraso = (hojeAno - venc.getFullYear()) * 12 + (hojeMes - venc.getMonth()) + 1;
      if (hoje.getDate() < venc.getDate()) mesesAtraso -= 1;
      const valorBaseTotal = valor * mesesAtraso;
      const multaAplic = multaAtiva ? multaValor : 0;
      const jurosAplic = multaAtiva ? (jurosDia * diasAtraso) : 0;
      const valorAtualizado = valorBaseTotal + multaAplic + jurosAplic;
      totalAtraso += valorAtualizado; qtdAtraso++;
      listaAtraso.push({ nome: c.name, valor: valorAtualizado, valor_base: valorBaseTotal, meses: mesesAtraso, multa: multaAplic, juros: jurosAplic, vencimento: vencStr });
      return;
    }

    const mes = venc.getMonth();
    const ano = venc.getFullYear();
    if (mes === mesSel && ano === anoSel) {
      const dia = venc.getDate();
      totalMes += valor; qtdMes++;
      if (!porDia[dia]) porDia[dia] = { valor: 0, qtd: 0, clientes: [] };
      porDia[dia].valor += valor;
      porDia[dia].qtd++;
      porDia[dia].clientes.push({ nome: c.name, valor: valor });
    }
  });

  const listaMes = [];
  Object.keys(porDia).forEach((d) => {
    porDia[d].clientes.forEach((c) => {
      listaMes.push({ nome: c.nome, valor: c.valor });
    });
  });
  listaAtraso.sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));
  const listaAReceberCompleta = [...listaMes, ...listaAtraso];

  const diasOrdenados = Object.keys(porDia).sort((a,b) => Number(a) - Number(b));
  const dadosGrafico = diasOrdenados.map((dia) => ({ dia: 'Dia ' + dia, valor: porDia[dia].valor, qtd: porDia[dia].qtd }));

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f1f5f9', p: 3 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '16px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AssessmentIcon sx={{ color: '#2563eb', fontSize: 30 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Dashboard Financeiro</Typography>
              <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>Acompanhe o resumo das cobrancas e recebimentos dos seus clientes.</Typography>
            </Box>
          </Box>
          <Button variant='outlined' startIcon={<ArrowBackIcon />} onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: '#e2e8f0', color: '#2563eb', backgroundColor: '#eff6ff', px: 2.5, py: 1 }}>Voltar para Clientes</Button>
        </Box>

        {carregando ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setDiaAberto('todos_atraso')}>
                <AccessTimeIcon sx={{ position: 'absolute', right: -10, bottom: -10, fontSize: 90, opacity: 0.15 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccessTimeIcon sx={{ fontSize: 18 }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: 0.5 }}>ATRASO</Typography>
                </Box>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, mb: 0.5 }}>R$ {fmtBR(totalAtraso)}</Typography>
                <Typography sx={{ fontSize: '0.8rem', opacity: 0.9 }}>{qtdAtraso} clientes</Typography>
              </Paper>

              <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                <EventAvailableIcon sx={{ position: 'absolute', right: -10, bottom: -10, fontSize: 90, opacity: 0.15 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <EventAvailableIcon sx={{ fontSize: 18 }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: 0.5 }}>TOTAL DO MES</Typography>
                </Box>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, mb: 0.5 }}>R$ {fmtBR(totalMes)}</Typography>
                <Typography sx={{ fontSize: '0.8rem', opacity: 0.9 }}>{qtdMes} clientes</Typography>
              </Paper>

              <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setDiaAberto('todos_a_receber')}>
                <CalendarMonthIcon sx={{ position: 'absolute', right: -10, bottom: -10, fontSize: 90, opacity: 0.15 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CalendarMonthIcon sx={{ fontSize: 18 }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: 0.5 }}>A RECEBER - {nomeMes[mesSel].toUpperCase()} {anoSel}</Typography>
                </Box>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, mb: 0.5 }}>R$ {fmtBR(totalMes + totalAtraso)}</Typography>
                <Typography sx={{ fontSize: '0.8rem', opacity: 0.9 }}>{qtdMes + qtdAtraso} clientes</Typography>
              </Paper>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 2 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CalendarMonthIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Recebimentos por Periodo</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>Valor a receber no mes selecionado.</Typography>
                    </Box>
                  </Box>
                  <Select size='small' value={mesSel + '-' + anoSel} onChange={(e) => { const [m, a] = e.target.value.split('-'); setMesSel(Number(m)); setAnoSel(Number(a)); }} sx={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    {mesesOpcoes.map((o) => (
                      <MenuItem key={o.mes + '-' + o.ano} value={o.mes + '-' + o.ano}>{o.label}</MenuItem>
                    ))}
                  </Select>
                </Box>
                <Box sx={{ mt: 3, height: 280 }}>
                  {dadosGrafico.length > 0 ? (
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={dadosGrafico} margin={{ top: 30, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#f1f5f9' />
                        <XAxis dataKey='dia' tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => 'R$ ' + v} />
                        <Tooltip formatter={(v) => 'R$ ' + fmtBR(v)} />
                        <Bar dataKey='valor' fill='#3b82f6' radius={[8, 8, 0, 0]}><LabelList dataKey='valor' position='top' formatter={(v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',')} style={{ fontSize: 11, fontWeight: 700, fill: '#0f172a' }} /></Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography sx={{ color: '#94a3b8', textAlign: 'center', pt: 8 }}>Nenhum cliente a receber neste mes</Typography>
                  )}
                </Box>
              </Paper>

              <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CalendarMonthIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Resumo por Vencimento</Typography>
                </Box>
                {diasOrdenados.length === 0 ? (
                  <Typography sx={{ color: '#94a3b8' }}>Nenhum cliente</Typography>
                ) : (
                  diasOrdenados.map((dia, idx) => {
                    const cor = CORES_DIA[idx % CORES_DIA.length];
                    return (
                      <Box key={dia} onClick={() => setDiaAberto(dia)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, p: 1.5, borderRadius: '12px', '&:hover': { backgroundColor: '#f8fafc' }, cursor: 'pointer' }}>
                        <Box sx={{ minWidth: 60, py: 0.5, borderRadius: '8px', backgroundColor: cor, color: '#fff', textAlign: 'center', fontWeight: 700, fontSize: '0.75rem' }}>Dia {dia}</Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>R$ {fmtBR(porDia[dia].valor)}</Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{porDia[dia].qtd} clientes</Typography>
                        </Box>
                        <ChevronRightIcon sx={{ color: '#94a3b8' }} />
                      </Box>
                    );
                  })
                )}
              </Paper>
            </Box>
          </>
        )}

        <Dialog open={!!diaAberto} onClose={() => setDiaAberto(null)} maxWidth='sm' fullWidth>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {diaAberto === 'todos_a_receber' ? 'A Receber - Mes + Atrasos' : 'Clientes - Dia ' + diaAberto + ' - ' + nomeMes[mesSel] + ' ' + anoSel}
            <IconButton onClick={() => setDiaAberto(null)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {diaAberto === 'todos_a_receber' && (
              <>
                {listaAReceberCompleta.map((c, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                    <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>{c.nome}</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#2563eb' }}>R$ {fmtBR(c.valor)}</Typography>
                  </Box>
                ))}
              </>
            )}
            {diaAberto === 'todos_atraso' && (
              <>
                {listaAtraso.map((c, i) => (
                  <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 2, alignItems: 'center', p: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                    <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>{c.nome}</Typography>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>{c.vencimento ? c.vencimento.split('-').reverse().join('/') : '-'}</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#dc2626', minWidth: 90, textAlign: 'right' }}>R$ {fmtBR(c.valor)}</Typography>
                  </Box>
                ))}
              </>
            )}
            {diaAberto !== 'todos_a_receber' && diaAberto !== 'todos_atraso' && diaAberto && porDia[diaAberto] && (
              <>
                {porDia[diaAberto].clientes.map((c, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                    <Typography sx={{ fontWeight: 600, color: '#1e293b' }}>{c.nome}</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#2563eb' }}>R$ {fmtBR(c.valor)}</Typography>
                  </Box>
                ))}
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Typography sx={{ flexGrow: 1, fontWeight: 700, color: '#64748b' }}>Total: R$ {diaAberto === 'todos_a_receber' ? fmtBR(totalMes + totalAtraso) : (diaAberto === 'todos_atraso' ? fmtBR(totalAtraso) : (diaAberto && porDia[diaAberto] ? fmtBR(porDia[diaAberto].valor) : '0,00'))}</Typography>
            <Button onClick={() => setDiaAberto(null)} sx={{ textTransform: 'none', color: '#475569' }}>Fechar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default DashboardTab;
