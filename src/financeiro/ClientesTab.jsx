import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Table, TableRow, TableCell, TableHead, TableBody, Box, Paper, Typography, Avatar, TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, MenuItem } from '@mui/material';
import { useSelector } from 'react-redux';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { useAsyncTask, useScrollToLoad, pageSize } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import TableShimmer from '../common/components/TableShimmer';
import SearchHeader from '../settings/components/SearchHeader';
import ExcelJS from 'exceljs';
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
  const user = useSelector((state) => state.session.user);
  const userId = user.id;
  const userAttributes = useSelector((state) => state.session.user.attributes) || {};
  const [modalBaixa, setModalBaixa] = useState(null);
  const [mesesBaixa, setMesesBaixa] = useState(1);
  const [salvandoBaixa, setSalvandoBaixa] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [contratosMap, setContratosMap] = useState({});
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);

  const [enviandoCobranca, setEnviandoCobranca] = useState(false);
  const carregarContratos = async () => {
    try {
      const r = await fetch('/api-contratos/invites');
      const d = await r.json();
      const m = {};
      (d.data || []).forEach((inv) => {
        if (!inv.client_user_id) return;
        const cur = m[inv.client_user_id];
        if (inv.status === 'signed') m[inv.client_user_id] = 'signed';
        else if (!cur) m[inv.client_user_id] = 'pending';
      });
      setContratosMap(m);
    } catch (e) { console.error('Erro ao carregar contratos', e); }
  };
  const abrirBaixa = (item) => { setModalBaixa(item); setMesesBaixa(1); };
  const mostrarAviso = (msg, ok) => { setAviso({ msg, ok }); setTimeout(() => setAviso(null), 3000); };
  const abrirCobranca = async (item) => {
    const tel1 = item.attributes?.fin_telefone1;
    const tel2 = item.attributes?.fin_telefone2;
    if (!tel1 && !tel2) { alert('Cliente sem telefone cadastrado'); return; }
    const vencStr = item.attributes?.fin_vencimento;
    if (!vencStr) { alert('Cliente sem vencimento cadastrado'); return; }
    const parts = vencStr.split('-');
    const venc = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const diff = Math.round((venc - hoje) / 86400000);
    const adm = userAttributes || {};
    const diasAntes = parseInt(adm.fin_msg_lembrete_dias || '3', 10);
    let tipo = 'Lembrete';
    let tpl = adm.fin_msg_lembrete;
    if (diff === 0) { tipo = 'Vencimento'; tpl = adm.fin_msg_vencimento; }
    else if (diff < 0) { tipo = 'Atraso'; tpl = adm.fin_msg_atraso; }
    if (!tpl) { alert('Template de mensagem nao configurado para ' + tipo); return; }
    const valorRaw = (item.attributes?.fin_valor || '0');
    const valorNum = parseFloat(valorRaw.replace(',', '.')) || 0;
    const multaNum = parseFloat((adm.fin_multa_valor || '0').replace(',', '.')) || 0;
    const jurosDiaNum = parseFloat((adm.fin_juros_valor || '0').replace(',', '.')) || 0;
    const multaAtiva = (adm.fin_multa_ativo !== 'false');
    const diasAtraso = diff < 0 ? Math.abs(diff) : 0;
    const multa = (multaAtiva && tipo === 'Atraso') ? multaNum : 0;
    const juros = (multaAtiva && tipo === 'Atraso') ? (jurosDiaNum * diasAtraso) : 0;
    const total = valorNum + multa + juros;
    const fmt = (n) => n.toFixed(2).replace('.', ',');
    const vencBR = String(parts[2]).padStart(2,'0') + '/' + String(parts[1]).padStart(2,'0') + '/' + parts[0];
    let texto = tpl;
    texto = texto.split('{nome}').join(item.name || '');
    texto = texto.split('{vencimento}').join(vencBR);
    texto = texto.split('{valor}').join(fmt(valorNum));
    texto = texto.split('{multa}').join(fmt(multa));
    texto = texto.split('{juros}').join(fmt(juros));
    texto = texto.split('{valor_atualizado}').join(fmt(total));
    texto = texto.split('{data_hoje}').join(new Date().toLocaleDateString('pt-BR'));
    texto = texto.split('{desconto}').join('0,00');
    texto = texto.split('{link_pagamento}').join('');
    texto = texto.split('{pix_copia_cola}').join('');
    const evoUrl = adm.fin_evo_url, evoKey = adm.fin_evo_key, evoInst = adm.fin_evo_instance;
    if (!evoUrl || !evoKey || !evoInst) { alert('Evolution API nao configurada'); return; }
    const nums = [tel1, tel2].filter(Boolean);
    let enviados = 0;
    for (let i = 0; i < nums.length; i++) {
      try {
        const r = await fetch(evoUrl.replace(/\/$/, '') + '/message/sendText/' + evoInst, {
          method: 'POST',
          headers: { apikey: evoKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: nums[i], text: texto }),
        });
        if (r.ok) enviados++;
      } catch (e) { console.error('Falha', nums[i], e); }
    }
    if (enviados > 0) mostrarAviso('Mensagem enviada com sucesso', true);
    else mostrarAviso('Erro ao enviar: nenhum numero recebeu', false);
  };
  const excluirUsuario = async () => {
    if (!confirmarExclusao) return;
    try {
      await fetchOrThrow('/api/users/' + confirmarExclusao.id, { method: 'DELETE' });
      setItems((prev) => prev.filter((u) => u.id !== confirmarExclusao.id));
      setConfirmarExclusao(null);
      mostrarAviso('Cliente excluido com sucesso', true);
    } catch (e) {
      console.error(e);
      mostrarAviso('Erro ao excluir: ' + e.message, false);
      setConfirmarExclusao(null);
    }
  };
  const marcarAssinado = async (item) => {
    if (!window.confirm('Marcar ' + (item.name || '') + ' como contrato ASSINADO (historico)?')) return;
    try {
      const r = await fetch('/api-contratos/invites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: null,
          client_name: item.name,
          client_user_id: item.id,
          client_data: { historico: true },
          expires_days: 3650,
          status: 'signed',
          signed_at: new Date().toISOString(),
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || 'Erro');
      setContratosMap((m) => ({ ...m, [item.id]: 'signed' }));
      mostrarAviso('Marcado como assinado', true);
    } catch (e) {
      console.error(e);
      mostrarAviso('Erro: ' + e.message, false);
    }
  };
  const marcarNaoCobrar = async (item, marcado) => {
    try {
      const attrs = { ...(item.attributes || {}), fin_nao_cobrar: marcado ? 'true' : 'false' };
      await fetchOrThrow('/api/users/' + item.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, name: item.name || '-', email: item.email || 'sem@local', attributes: attrs, administrator: item.administrator, masteruser: item.masteruser }),
      });
      setItems((prev) => prev.map((u) => u.id === item.id ? { ...u, attributes: attrs } : u));
      mostrarAviso(marcado ? 'Cliente marcado como NAO COBRAR' : 'Cliente voltou a ser cobrado', true);
    } catch (e) {
      console.error(e);
      mostrarAviso('Erro: ' + e.message, false);
    }
  };
  const baixarModelo = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Clientes');
      ws.columns = [
        { header: 'Nome', key: 'nome', width: 30 },
        { header: 'Telefone 1', key: 'tel1', width: 20 },
        { header: 'Telefone 2', key: 'tel2', width: 20 },
        { header: 'Valor', key: 'valor', width: 12 },
        { header: 'Vencimento', key: 'venc', width: 15 },
      ];
      ws.addRow({ nome: 'Cliente Exemplo', tel1: '5586999990000', tel2: '', valor: '100,00', venc: '16/12/2026' });
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo-clientes.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      mostrarAviso('Erro ao gerar modelo: ' + e.message, false);
    }
  };
  const uploadExcel = async (file) => {
    if (!file) return;
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) { mostrarAviso('Planilha vazia', false); return; }
      const header = {};
      ws.getRow(1).eachCell((cell, col) => {
        const key = String(cell.value || '').toLowerCase().trim();
        header[col] = key;
      });
      const idxNome = Object.keys(header).find((k) => header[k].includes('nome'));
      const idxTel1 = Object.keys(header).find((k) => header[k].includes('telefone 1') || header[k] === 'telefone1');
      const idxTel2 = Object.keys(header).find((k) => header[k].includes('telefone 2') || header[k] === 'telefone2');
      const idxValor = Object.keys(header).find((k) => header[k].includes('valor'));
      const idxVenc = Object.keys(header).find((k) => header[k].includes('vencimento'));
      if (!idxNome) { mostrarAviso('Coluna Nome nao encontrada', false); return; }
      let atualizados = 0;
      let ignorados = 0;
      const linhas = [];
      ws.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const nome = String(row.getCell(Number(idxNome)).value || '').trim();
        if (!nome) return;
        linhas.push({
          nome,
          tel1: idxTel1 ? String(row.getCell(Number(idxTel1)).value || '').trim() : '',
          tel2: idxTel2 ? String(row.getCell(Number(idxTel2)).value || '').trim() : '',
          valor: idxValor ? String(row.getCell(Number(idxValor)).value || '').trim() : '',
          venc: idxVenc ? row.getCell(Number(idxVenc)).value : '',
        });
      });
      for (let i = 0; i < linhas.length; i++) {
        const l = linhas[i];
        const item = items.find((u) => (u.name || '').toLowerCase() === l.nome.toLowerCase());
        if (!item) { ignorados++; continue; }
        const attrs = { ...(item.attributes || {}) };
        if (l.tel1) attrs.fin_telefone1 = l.tel1;
        if (l.tel2) attrs.fin_telefone2 = l.tel2;
        if (l.valor) attrs.fin_valor = l.valor;
        if (l.venc) {
          let v = l.venc;
          if (v instanceof Date) {
            v = v.toISOString().slice(0, 10);
          } else {
            v = String(v).trim();
            if (v.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
              const [d, m, a] = v.split('/');
              v = a + '-' + m + '-' + d;
            }
          }
          attrs.fin_vencimento = v;
        }
        try {
          await fetchOrThrow('/api/users/' + item.id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id, name: item.name || '-', email: item.email || 'sem@local', attributes: attrs, administrator: item.administrator, masteruser: item.masteruser }),
          });
          setItems((prev) => prev.map((u) => u.id === item.id ? { ...u, attributes: attrs } : u));
          atualizados++;
        } catch (e) { console.error('Falha ao atualizar', l.nome, e); }
      }
      mostrarAviso('Atualizados: ' + atualizados + ' | Ignorados: ' + ignorados, true);
    } catch (e) {
      console.error(e);
      mostrarAviso('Erro ao ler planilha: ' + e.message, false);
    }
  };

  const enviarContrato = async (item) => {
    const tel1 = item.attributes?.fin_telefone1;
    const tel2 = item.attributes?.fin_telefone2;
    if (!tel1 && !tel2) { alert('Cliente sem telefone cadastrado'); return; }
    const adm = userAttributes || {};
    const evoUrl = adm.fin_evo_url, evoKey = adm.fin_evo_key, evoInst = adm.fin_evo_instance;
    if (!evoUrl || !evoKey || !evoInst) { alert('Evolution API nao configurada'); return; }
    try {
      const r = await fetch('/api-contratos/invites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: null,
          client_name: item.name,
          client_user_id: item.id,
          client_data: { phone: tel1 || tel2 },
          expires_days: 7,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || 'Erro ao criar convite');
      const link = window.location.origin + '/sign/' + d.token;
      const texto = 'Ola *' + (item.name || '') + '*!\n\nSegue o link para preenchimento e assinatura do seu contrato de rastreamento:\n\n' + link + '\n\nO link expira em 7 dias.';
      const nums = [tel1, tel2].filter(Boolean);
      let enviados = 0;
      for (let i = 0; i < nums.length; i++) {
        try {
          const rr = await fetch(evoUrl.replace(/\/$/, '') + '/message/sendText/' + evoInst, {
            method: 'POST', headers: { apikey: evoKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: nums[i], text: texto }),
          });
          if (rr.ok) enviados++;
        } catch (e) { console.error('Falha', nums[i], e); }
      }
      if (enviados > 0) mostrarAviso('Link de contrato enviado', true);
      else mostrarAviso('Erro ao enviar o link', false);
    } catch (e) {
      console.error(e);
      mostrarAviso('Erro: ' + e.message, false);
    }
  };
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
  const valorTotal = (item, meses) => {
    const v = (item.attributes?.fin_valor || '0').replace(',', '.');
    const n = parseFloat(v) || 0;
    return (n * meses).toFixed(2).replace('.', ',');
  };

﻿﻿﻿  const confirmarBaixa = async () => {
    if (!modalBaixa) return;
    setSalvandoBaixa(true);
    try {
      const vencAtual = modalBaixa.attributes?.fin_vencimento || '';
      const novoVenc = calcNovoVencimento(vencAtual, mesesBaixa);
      const attrs = { ...(modalBaixa.attributes || {}), fin_vencimento: novoVenc };
      await fetchOrThrow('/api/users/' + modalBaixa.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: modalBaixa.id, name: modalBaixa.name || '-', email: modalBaixa.email || 'sem@local', attributes: attrs , administrator: modalBaixa.administrator, masteruser: modalBaixa.masteruser }),
      });
      setItems((prev) => prev.map((u) => u.id === modalBaixa.id ? { ...u, attributes: attrs } : u));
      const adm = userAttributes || {};
      const evoUrl = adm.fin_evo_url;
      const evoKey = adm.fin_evo_key;
      const evoInst = adm.fin_evo_instance;
      const recibo = adm.fin_msg_recibo;
      console.log('ADM', adm);
      if (evoUrl && evoKey && evoInst && recibo) {
        const hoje = new Date();
        const dataHoje = String(hoje.getDate()).padStart(2, '0') + '/' + String(hoje.getMonth() + 1).padStart(2, '0') + '/' + hoje.getFullYear();
        const valorT = valorTotal(modalBaixa, mesesBaixa);
        const novoVencBR = formatarDataBR(novoVenc);
        const vencParts = vencAtual.split('-');
        const vencDate = new Date(Number(vencParts[0]), Number(vencParts[1]) - 1, Number(vencParts[2]));
        const hojeDate = new Date(); hojeDate.setHours(0,0,0,0);
        const diasAtraso = Math.max(0, Math.round((hojeDate - vencDate) / 86400000));
        const multaValor = parseFloat((adm.fin_multa_valor || '0').replace(',', '.')) || 0;
        const jurosDiaValor = parseFloat((adm.fin_juros_valor || '0').replace(',', '.')) || 0;
        const multaAtiva = (adm.fin_multa_ativo !== 'false');
        const multa = (multaAtiva && diasAtraso > 0) ? multaValor : 0;
        const juros = (multaAtiva && diasAtraso > 0) ? (jurosDiaValor * diasAtraso) : 0;
        const valorNum = parseFloat(valorT.replace('.', '').replace(',', '.')) || 0;
        const totalAtualizado = valorNum + multa + juros;
        const fmt = (n) => n.toFixed(2).replace('.', ',');
        let texto = recibo;
        texto = texto.split('{nome}').join(modalBaixa.name || '');
        texto = texto.split('{vencimento}').join(formatarDataBR(vencAtual));
        texto = texto.split('{valor}').join(valorT);
        texto = texto.split('{valor_atualizado}').join(fmt(totalAtualizado));
        texto = texto.split('{data_hoje}').join(dataHoje);
        texto = texto.split('{multa}').join(fmt(multa));
        texto = texto.split('{juros}').join(fmt(juros));
        texto = texto.split('{desconto}').join('');
        texto = texto.split('{prox_vencimento}').join(novoVencBR);
        texto = texto.split('{link_pagamento}').join('');
        const nums = [modalBaixa.attributes?.fin_telefone1, modalBaixa.attributes?.fin_telefone2].filter(Boolean);
        for (let i = 0; i < nums.length; i++) {
          const num = nums[i];
          try {
            await fetch(evoUrl.replace(/\/$/, '') + '/message/sendText/' + evoInst, {
              method: 'POST',
              headers: { apikey: evoKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ number: num, text: texto }),
            });
          } catch (err) { console.error('Erro WhatsApp', num, err); }
        }
      }
      setModalBaixa(null);
      mostrarAviso('Baixa enviada com sucesso', true);
    } catch (e) { console.error(e); }
    finally { setSalvandoBaixa(false); }
  };

  const salvarTudo = async () => {
    try {
      const attrs = { ...userAttributes, fin_msg_recibo: reciboTexto };
      await fetchOrThrow('/api/users/' + userId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, name: user.name || '-', email: user.email || 'sem@local', attributes: attrs , administrator: user.administrator, masteruser: user.masteruser }),
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
        body: JSON.stringify({ id: item.id, name: item.name || '-', email: item.email || item.name || 'sem@email.com', attributes: attrs , administrator: user.administrator, masteruser: user.masteruser }),
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
      await carregarContratos();
    },
    [reloadKey, loadItems],
  );

  const filteredItems = items.filter((u) => !u.temporary).filter((u) => {
    if (!searchKeyword) return true;
    const k = searchKeyword.toLowerCase();
    return (u.name && u.name.toLowerCase().includes(k)) || (u.email && u.email.toLowerCase().includes(k));
  }).sort((a, b) => {
    const aNao = a.attributes?.fin_nao_cobrar === 'true' ? 1 : 0;
    const bNao = b.attributes?.fin_nao_cobrar === 'true' ? 1 : 0;
    return aNao - bNao;
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flexGrow: 1 }}>
              <SearchHeader keyword={searchKeyword} setKeyword={setSearchKeyword} />
            </Box>
            <input
              id="upload-excel-input"
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => { uploadExcel(e.target.files[0]); e.target.value = ''; }}
            />
            <Button variant='outlined' onClick={baixarModelo} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', borderColor: '#e2e8f0', color: '#475569' }}>Baixar Modelo</Button>
            <label htmlFor="upload-excel-input">
              <Button component='span' variant='outlined' startIcon={<UploadFileIcon />} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', borderColor: '#e2e8f0', color: '#475569' }}>Importar Excel</Button>
            </label>
          </Box>
        <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: 8 }}>
          <Paper elevation={0} sx={{ borderRadius: '24px', border: '1px solid #edf2f7', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)', overflow: 'hidden', backgroundColor: '#ffffff' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0, zIndex: 5 }}>
                  <TableRow>
                    <TableCell sx={headCell}>{t('sharedName')}</TableCell>
                    <TableCell sx={headCell}>Telefone 1</TableCell>
                    <TableCell sx={{ ...headCell, display: { xs: 'none', md: 'table-cell' } }}>Telefone 2</TableCell>
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
                        <TableCell sx={{ ...bodyCell, display: { xs: 'none', md: 'table-cell' } }}>
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
                            <span>{item.attributes?.fin_vencimento ? formatarDataBR(item.attributes.fin_vencimento) : '-'}</span>
                          )}
                        </TableCell>
                        <TableCell sx={bodyCell}>
                          {editando[item.id] ? (
                            <TextField size='small' value={rascunho[item.id]?.contrato || ''} onChange={(e) => setRascunho((r) => ({ ...r, [item.id]: { ...r[item.id], contrato: e.target.value } }))} />
                          ) : (
                            (() => { const st = contratosMap[item.id]; const stBadge = (txt, bg, cor) => <span style={{ backgroundColor: bg, color: cor, padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: '0.75rem' }}>{txt}</span>; if (st === 'signed') return stBadge('Assinado', '#dcfce7', '#16a34a'); if (st === 'pending') return stBadge('Pendente', '#fed7aa', '#ea580c'); return <span style={{ cursor: 'pointer' }} onDoubleClick={() => marcarAssinado(item)} title='Duplo clique para marcar como assinado (historico)'>-</span>; })()
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1.6, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {editando[item.id] ? (
                            <IconButton size='small' color='primary' onClick={() => salvar(item)}><SaveIcon fontSize='small' /></IconButton>
                          ) : (
                            <>
                              <IconButton size='small' onClick={() => enviarContrato(item)} title='Enviar Contrato'><DescriptionIcon fontSize='small' sx={{ color: '#f97316' }} /></IconButton>
                              <IconButton size='small' onClick={() => abrirCobranca(item)} title='WhatsApp'><ChatBubbleIcon fontSize='small' sx={{ color: '#22c55e' }} /></IconButton>
                              <IconButton size='small' onClick={() => abrirBaixa(item)} title='Confirmar Pagamento'><CheckCircleIcon fontSize='small' sx={{ color: '#3b82f6' }} /></IconButton>
                              <IconButton size='small' onClick={() => iniciarEdicao(item)} title='Editar'><EditIcon fontSize='small' /></IconButton>
                              <IconButton size='small' onClick={() => setConfirmarExclusao(item)} title='Excluir'><DeleteIcon fontSize='small' sx={{ color: '#dc2626' }} /></IconButton>
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
      {aviso && (
        <Box sx={{ position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999, px: 4, py: 2, borderRadius: 2, backgroundColor: aviso.ok ? '#22c55e' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: '1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          {aviso.msg}
        </Box>
      )}
      <Dialog open={!!confirmarExclusao} onClose={() => setConfirmarExclusao(null)} maxWidth='xs' fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Excluir cliente</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja excluir <strong>{confirmarExclusao?.name}</strong>? Esta acao nao pode ser desfeita.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmarExclusao(null)} sx={{ textTransform: 'none', color: '#475569' }}>Cancelar</Button>
          <Button onClick={excluirUsuario} variant='contained' sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#dc2626' }}>Excluir</Button>
        </DialogActions>
      </Dialog>
      </Box>
      </Box>
    </>
  );
};

export default ClientesTab;
