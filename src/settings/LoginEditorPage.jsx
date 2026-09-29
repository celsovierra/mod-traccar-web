import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, Popover } from '@mui/material';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from '../settings/components/SettingsMenu';

const defaults = {
  nome: 'GUImod',
  subtitulo: 'Sistema de Rastreamento Veicular',
  corFundo: '#0b1d3a',
  corIcone: '#7c3aed',
  corTexto: '#ffffff',
  corBotao: '#2563eb',
  corTitulo: '#0f172a',
  corSubtitulo: '#64748b',
  tema: 'radar',
  imagem: '',
};

const STORAGE_KEY = 'login_editor_config';

const hslToHex = (h, s, l) => {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
};
const espectro = Array.from({ length: 48 }, (_, i) => hslToHex((i * 360) / 48, 90, 55));

const LoginEditorPage = () => {
  const [cfg, setCfg] = useState(() => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch { return defaults; }
  });

  
  const [anchorEl, setAnchorEl] = useState(null);
  const [paletaKey, setPaletaKey] = useState(null);

  const abrirPaleta = (e, key) => setPaletaKey(key);
  const fecharPaleta = () => setPaletaKey(null);
const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  useEffect(() => {
    fetch('/api-contratos/login-config').then((r) => r.json()).then((d) => { if (d && Object.keys(d).length) setCfg({ ...defaults, ...d }); }).catch(() => {});
  }, []);
  const salvar = async () => {
    try {
      const r = await fetch('/api-contratos/login-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
      if (r.ok) alert('Salvo!'); else alert('Erro ao salvar');
    } catch { alert('Erro ao salvar'); }
  };
  const resetar = async () => {
    setCfg(defaults);
    try { await fetch('/api-contratos/login-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(defaults) }); } catch {}
  };

  const campo = (label, key) => (
    <TextField label={label} size="small" fullWidth value={cfg[key]} onChange={(e) => set(key, e.target.value)} sx={{ mb: 1.5 }} />
  );

  const campoCor = (label, key) => (
    <Box sx={{ mb: 1.5 }}>
      <Typography sx={{ fontSize: '0.78rem', color: '#64748b', mb: 0.5 }}>{label}</Typography>
      <Box onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const pct = (e.clientX - rect.left) / rect.width; const idx = Math.min(espectro.length - 1, Math.max(0, Math.round(pct * (espectro.length - 1)))); set(key, espectro[idx]); }} sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1, border: '1px solid #cbd5e1', borderRadius: 1, p: 0.5, cursor: 'pointer', '&:hover': { borderColor: '#2563eb' } }}>
        <Box sx={{ width: 26, height: 26, borderRadius: 1, backgroundColor: cfg[key], border: '2px solid #fff', boxShadow: '0 0 0 1px #cbd5e1', zIndex: 2 }} />
        <Box sx={{ flex: 1, height: 18, borderRadius: 1, background: `linear-gradient(to right, ${espectro.join(', ')})` }} />
      </Box>
    </Box>
  );

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'Editar Area de Login']}>
      <Box sx={{ display: 'flex', gap: 3, p: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 3, flex: '1 1 320px', maxWidth: 400 }}>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>Configuracoes</Typography>
          <Button variant="outlined" component="label" fullWidth sx={{ textTransform: 'none', fontWeight: 700, mb: 1.5 }}>
            Upload de Logo
            <input type="file" hidden accept="image/*" onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => set('logo', reader.result);
              reader.readAsDataURL(file);
            }} />
          </Button>
          {campo('Nome', 'nome')}
          {campo('Subtitulo', 'subtitulo')}
          {campoCor('Cor de Fundo', 'corFundo')}
          {campoCor('Cor do Icone', 'corIcone')}
          {campoCor('Cor do Texto', 'corTexto')}
          {campoCor('Cor do Botao', 'corBotao')}
          {campoCor('Cor do Titulo', 'corTitulo')}
          {campoCor('Cor do Subtitulo', 'corSubtitulo')}
          <Typography sx={{ fontSize: '0.78rem', color: '#64748b', mb: 0.5, mt: 1 }}>Imagem de Fundo</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
            {[
              { nome: 'Nenhuma', url: '' },
              { nome: 'Nenhuma', url: '' },
              { nome: 'GPS', url: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80' },
              { nome: 'Mapa', url: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&q=80' },
              { nome: 'Satelite', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80' },
              { nome: 'Rota', url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80' },
              { nome: 'Cidade', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80' },
              { nome: 'Trafico', url: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80' },
              { nome: 'Aereo', url: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800&q=80' },
              { nome: 'Estrada', url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80' },
              { nome: 'Moto', url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80' },
              { nome: 'Carro', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80' },
              { nome: 'Caminhao', url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&q=80' },
              { nome: 'Rastreio', url: 'https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=800&q=80' },
              { nome: 'Radar', url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80' },
              { nome: 'Satelite2', url: 'https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800&q=80' },
              { nome: 'Avenida', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80' },
              { nome: 'Frota', url: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=800&q=80' },
              { nome: 'Motorista', url: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=800&q=80' },
            ].map((img) => (
              <Box key={img.nome} onClick={() => set('imagem', img.url)} sx={{ cursor: 'pointer', borderRadius: 1, overflow: 'hidden', border: cfg.imagem === img.url ? '2px solid #2563eb' : '1px solid #cbd5e1', position: 'relative', height: 52, background: img.url ? `url(${img.url}) center/cover` : '#f1f5f9', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <Box sx={{ width: '100%', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '0.62rem', fontWeight: 700, textAlign: 'center', py: 0.3 }}>{img.nome}</Box>
              </Box>
            ))}
          </Box>
          <Typography sx={{ fontSize: '0.78rem', color: '#64748b', mb: 0.5, mt: 1 }}>Tema de Fundo</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 2 }}>
            {['radar', 'grade', 'ondas', 'mapa', 'pontos', 'circuito', 'nebulosa', 'limpo'].map((t) => (
              <Box key={t} onClick={() => set('tema', t)} sx={{ p: 1, textAlign: 'center', fontSize: '0.68rem', fontWeight: 700, borderRadius: 1, cursor: 'pointer', border: cfg.tema === t ? '2px solid #2563eb' : '1px solid #cbd5e1', color: cfg.tema === t ? '#2563eb' : '#64748b', '&:hover': { borderColor: '#2563eb' } }}>{t}</Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button variant="contained" onClick={salvar} sx={{ textTransform: 'none', fontWeight: 700 }}>Salvar</Button>
            <Button variant="outlined" onClick={resetar} sx={{ textTransform: 'none', fontWeight: 700 }}>Resetar</Button>
          </Box>
        </Paper>

        <Box sx={{ flex: '1 1 380px' }}>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>Preview</Typography>
          <Box sx={{ position: 'relative', width: '100%', height: '100%', borderRadius: 3, overflow: 'hidden', background: cfg.imagem ? `url(${cfg.imagem}) center/cover` : `linear-gradient(160deg, ${cfg.corFundo} 0%, ${cfg.corFundo}dd 55%, ${cfg.corFundo}aa 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}>
            {cfg.tema === 'radar' && (<>
              <Box sx={{ position: 'absolute', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', width: 400, height: 400, top: -80, left: '50%', transform: 'translateX(-50%)' }} />
              <Box sx={{ position: 'absolute', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', width: 280, height: 280, top: -20, left: '50%', transform: 'translateX(-50%)' }} />
            </>)}
            {cfg.tema === 'grade' && (<Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />)}
            {cfg.tema === 'ondas' && (<Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 10px, transparent 10px 20px)' }} />)}
            {cfg.tema === 'mapa' && (<Box sx={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'radial-gradient(circle at 30% 40%, #fff 2px, transparent 2px), radial-gradient(circle at 70% 60%, #fff 2px, transparent 2px), radial-gradient(circle at 50% 80%, #fff 2px, transparent 2px)', backgroundSize: '120px 120px' }} />)}
            {cfg.tema === 'pontos' && (<Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />)}
            {cfg.tema === 'circuito' && (<Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.06) 50%, transparent 50%), linear-gradient(rgba(255,255,255,0.06) 50%, transparent 50%)', backgroundSize: '30px 30px' }} />)}
            {cfg.tema === 'nebulosa' && (<Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(124,58,237,0.35), transparent 50%), radial-gradient(circle at 80% 70%, rgba(37,99,235,0.35), transparent 50%)' }} />)}
            <Box sx={{ textAlign: 'center', mb: 3, zIndex: 1 }}>
              <Box sx={{ width: 72, height: 72, borderRadius: 2, background: cfg.corIcone, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                {cfg.logo ? <img src={cfg.logo} alt='logo' style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Typography sx={{ color: cfg.corTexto, fontSize: 40, fontWeight: 700 }}>A</Typography>}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: cfg.corTexto, letterSpacing: '-0.5px' }}>{cfg.nome}</Typography>
              <Typography variant="caption" sx={{ color: cfg.corTexto, opacity: 0.7, fontWeight: 500 }}>{cfg.subtitulo}</Typography>
            </Box>
            <Box sx={{ width: 300, background: '#fff', borderRadius: 4, p: 3, zIndex: 1, boxShadow: '0 -12px 40px rgba(0,0,0,0.25)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: cfg.corTitulo, mb: 0.3 }}>Bem-vindo de volta</Typography>
              <Typography variant="caption" sx={{ color: cfg.corSubtitulo, display: 'block', mb: 2 }}>Entre com sua conta para continuar</Typography>
              <TextField fullWidth size="small" label="Email" sx={{ mb: 1.5 }} />
              <TextField fullWidth size="small" label="Senha" type="password" sx={{ mb: 2 }} />
              <Button fullWidth variant="contained" sx={{ background: cfg.corBotao, textTransform: 'none', fontWeight: 700, borderRadius: 2, '&:hover': { background: cfg.corBotao, filter: 'brightness(0.9)' } }}>Entrar</Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </PageLayout>
  );
};

export default LoginEditorPage;
