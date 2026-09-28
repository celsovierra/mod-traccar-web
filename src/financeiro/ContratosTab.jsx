import { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, IconButton, Chip, Switch, FormControlLabel } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import DescriptionIcon from '@mui/icons-material/Description';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const VARIAVEIS = [
  '{nome}', '{cpf}', '{endereco}', '{numero}', '{bairro}', '{cidade}', '{whatsapp}', '{email}',
  '{veiculos}', '{vencimento}', '{valor}', '{data_atual}', '{empresa}',
  '{contratada_nome}', '{contratada_fantasia}', '{contratada_cnpj}', '{contratada_endereco}',
  '{cpf_cnpj}', '{cidade_uf}', '{telefone}', '{quantidade_equipamentos}', '{quantidade_extenso}',
  '{valor_equipamento}', '{valor_equipamento_extenso}', '{valor_mensalidade}',
  '{valor_mensalidade_extenso}', '{forma_pagamento}', '{data_vencimento}',
  '{tempo_fidelidade}', '{multa_fidelidade}', '{aviso_previo}', '{foro}', '{cidade_assinatura}'
];

const ContratosTab = () => {
  const [templates, setTemplates] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nome, setNome] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [padrao, setPadrao] = useState(false);

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setCarregando(true);
    try {
      const r = await fetch('/api-contratos/templates');
      const d = await r.json();
      setTemplates(d.data || []);
    } catch (e) { console.error(e); }
    finally { setCarregando(false); }
  };

  const abrirNovo = () => {
    setEditando({});
    setNome('');
    setConteudo('');
    setPadrao(false);
  };

  const abrirEdicao = (t) => {
    setEditando(t);
    setNome(t.name);
    setConteudo(t.content);
    setPadrao(!!t.is_default);
  };

  const salvar = async () => {
    if (!nome.trim() || !conteudo.trim()) { alert('Preencha nome e conteudo'); return; }
    try {
      if (editando?.id) {
        await fetch('/api-contratos/templates/' + editando.id, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nome, content: conteudo, is_default: padrao }),
        });
      } else {
        await fetch('/api-contratos/templates', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nome, content: conteudo, is_default: padrao }),
        });
      }
      setEditando(null);
      carregar();
    } catch (e) { alert('Erro ao salvar'); }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir este template?')) return;
    await fetch('/api-contratos/templates/' + id, { method: 'DELETE' });
    carregar();
  };

  const inserirVariavel = (v) => setConteudo((c) => c + v);

  if (editando) {
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <IconButton onClick={() => setEditando(null)}><ArrowBackIcon /></IconButton>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{editando.id ? 'Editar Template' : 'Novo Template'}</Typography>
        </Box>
        <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 1 }}>Nome do template</Typography>
          <TextField fullWidth size='small' value={nome} onChange={(e) => setNome(e.target.value)} sx={{ mb: 2 }} />
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 1 }}>Variaveis disponiveis (clique para inserir)</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            {VARIAVEIS.map((v) => (
              <Chip key={v} label={v} size='small' onClick={() => inserirVariavel(v)} sx={{ fontSize: '0.7rem', cursor: 'pointer' }} />
            ))}
          </Box>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 1 }}>Conteudo do contrato</Typography>
          <TextField fullWidth multiline rows={14} value={conteudo} onChange={(e) => setConteudo(e.target.value)} sx={{ mb: 2, fontFamily: 'monospace' }} />
          <FormControlLabel control={<Switch checked={padrao} onChange={(e) => setPadrao(e.target.checked)} />} label='Template padrao' sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setEditando(null)} sx={{ textTransform: 'none', color: '#475569' }}>Cancelar</Button>
            <Button variant='contained' startIcon={<SaveIcon />} onClick={salvar} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', backgroundColor: '#2563eb' }}>Salvar</Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>Modelos de Contrato</Typography>
        <Button variant='contained' startIcon={<AddIcon />} onClick={abrirNovo} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', backgroundColor: '#2563eb' }}>Novo Template</Button>
      </Box>
      {carregando ? <Typography>Carregando...</Typography> : templates.length === 0 ? (
        <Paper elevation={0} sx={{ p: 3, textAlign: 'center', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <Typography sx={{ color: '#64748b' }}>Nenhum template cadastrado.</Typography>
        </Paper>
      ) : templates.map((t) => (
        <Paper key={t.id} elevation={0} sx={{ p: 2, mb: 1.5, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <DescriptionIcon sx={{ color: '#64748b', fontSize: 18 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', flexGrow: 1 }}>{t.name}</Typography>
            {!!t.is_default && <StarIcon sx={{ color: '#eab308', fontSize: 16 }} />}
            <IconButton size='small' onClick={() => abrirEdicao(t)}><EditIcon fontSize='small' /></IconButton>
            <IconButton size='small' onClick={() => excluir(t.id)}><DeleteIcon fontSize='small' sx={{ color: '#dc2626' }} /></IconButton>
          </Box>
          <Typography sx={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{t.content}</Typography>
        </Paper>
      ))}
    </Box>
  );
};

export default ContratosTab;
