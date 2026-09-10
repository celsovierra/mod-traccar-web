import { useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const pill = (active) => ({
  fontSize: 12.5,
  fontWeight: 700,
  minWidth: 0,
  px: 2.25,
  py: 0.75,
  borderRadius: 999,
  textTransform: 'none',
  whiteSpace: 'nowrap',
  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
  backgroundColor: active ? '#3b82f6' : 'rgba(255,255,255,0.06)',
  '&:hover': { backgroundColor: active ? '#2563eb' : 'rgba(255,255,255,0.14)' },
});

const clock = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const summarize = (positions) => {
  if (!positions || !positions.length) return null;
  const R = 6371;
  let km = 0;
  let max = 0;
  let sum = 0;
  for (let i = 1; i < positions.length; i += 1) {
    const a = positions[i - 1];
    const b = positions[i];
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    km += 2 * R * Math.asin(Math.sqrt(h));
    const kmh = (b.speed || 0) * 1.852;
    if (kmh > max) max = kmh;
    sum += kmh;
  }
  const first = new Date(positions[0].fixTime);
  const last = new Date(positions[positions.length - 1].fixTime);
  const mins = Math.max(0, Math.round((last - first) / 60000));
  return {
    km: km.toFixed(1),
    max: max.toFixed(0),
    avg: (sum / Math.max(1, positions.length - 1)).toFixed(0),
    duration: mins < 60 ? mins + 'min' : Math.floor(mins / 60) + 'h ' + (mins % 60) + 'min',
    first: first.toLocaleString('pt-BR'),
    last: last.toLocaleString('pt-BR'),
  };
};

const HistoryPanel = ({ positions, loading, onSelect, onDashboard, onPdf }) => {
  const [period, setPeriod] = useState(null);
  const [dashOpen, setDashOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');

  const range = (key) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    if (key === '1h') { start.setHours(now.getHours() - 1); }
    if (key === 'today') { start.setHours(0, 0, 0, 0); }
    if (key === 'yesterday') {
      start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1); end.setHours(23, 59, 59, 999);
    }
    if (key === 'week') { start.setDate(now.getDate() - 7); start.setHours(0, 0, 0, 0); }
    return { from: start.toISOString(), to: end.toISOString() };
  };

  const pick = (key) => {
    setPeriod(key);
    setCustom(false);
    onSelect(range(key));
  };

  const applyCustom = () => {
    if (!fromValue || !toValue) return;
    onSelect({ from: new Date(fromValue).toISOString(), to: new Date(toValue).toISOString() });
  };

  const stats = useMemo(() => {
    if (!positions.length) return null;
    let stops = 0;
    let moving = true;
    positions.forEach((p) => {
      const idle = (p.speed || 0) < 1;
      if (idle && moving) { stops += 1; moving = false; }
      if (!idle) moving = true;
    });
    return {
      points: positions.length,
      stops,
      first: clock(positions[0].fixTime),
      last: clock(positions[positions.length - 1].fixTime),
    };
  }, [positions]);

  const exportPdf = () => {
    const s = summarize(positions);
    if (!s) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write('<html><head><title>Relatorio de percurso</title></head><body style="font-family:system-ui,sans-serif;padding:24px;">'
      + '<h2 style="margin:0 0 16px;">Relatorio de percurso</h2>'
      + '<table style="border-collapse:collapse;font-size:14px;">'
      + [['Distancia', s.km + ' km'], ['Velocidade maxima', s.max + ' km/h'], ['Velocidade media', s.avg + ' km/h'], ['Duracao', s.duration], ['Paradas', String(stats ? stats.stops : 0)], ['Pontos', String(positions.length)], ['Inicio', s.first], ['Fim', s.last]]
        .map((r) => '<tr><td style="padding:6px 16px 6px 0;color:#555;">' + r[0] + '</td><td style="padding:6px 0;font-weight:700;">' + r[1] + '</td></tr>').join('')
      + '</table></body></html>');
    w.document.close();
    w.focus();
    w.print();
  };

  const legend = [
    ['#22c55e', '0-40'],
    ['#f97316', '41-80'],
    ['#ef4444', '81-110'],
    ['#7f1d1d', '+110'],
  ];

  return (
    <Box sx={{ mx: -2, mt: -2, mb: 1, px: 2, py: 1.75, background: 'linear-gradient(180deg,#0f172a,#111f3d)', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 6px 16px rgba(0,0,0,0.25)' }}>
      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.75, '&::-webkit-scrollbar': { display: 'none' } }}>
        {[['1h', '1h'], ['today', 'Hoje'], ['yesterday', 'Ontem'], ['week', 'Semana']].map(([key, label]) => (
          <Button key={key} size="small" disableElevation disabled={loading} onClick={() => pick(key)} sx={pill(period === key)}>
            {label}
          </Button>
        ))}
        <Button
          size="small"
          disableElevation
          startIcon={<CalendarMonthIcon sx={{ fontSize: 14 }} />}
          onClick={() => { setCustom(!custom); setPeriod('custom'); }}
          sx={pill(period === 'custom')}
        >
          Custom
        </Button>
        {loading && <CircularProgress size={14} sx={{ color: '#60a5fa', alignSelf: 'center' }} />}
      </Stack>

      {custom && (
        <Stack direction="row" spacing={0.75} sx={{ mb: 1 }}>
          <TextField type="datetime-local" size="small" fullWidth value={fromValue} onChange={(e) => setFromValue(e.target.value)} sx={{ '& .MuiInputBase-input': { color: '#fff', fontSize: 11, py: 0.75 }, '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }} />
          <TextField type="datetime-local" size="small" fullWidth value={toValue} onChange={(e) => setToValue(e.target.value)} sx={{ '& .MuiInputBase-input': { color: '#fff', fontSize: 11, py: 0.75 }, '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }} />
          <Button size="small" variant="contained" onClick={applyCustom} sx={{ fontSize: 11, textTransform: 'none' }}>OK</Button>
        </Stack>
      )}

      {stats && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', fontSize: 12, mt: 1.25, color: 'rgba(255,255,255,0.85)' }}>
            <span>{`\u{1F4CD} ${stats.points} pontos`}</span>
            <span style={{ color: '#fb923c' }}>{`\u23F1 ${stats.stops} paradas`}</span>
            <span>{`\u25CF ${stats.first}`}</span>
            <span>{`\u25CF ${stats.last}`}</span>
            <Box sx={{ ml: 'auto', display: 'flex', gap: 0.75 }}>
              <Button size="small" disableElevation startIcon={<BarChartIcon sx={{ fontSize: 14 }} />} onClick={() => (onDashboard ? onDashboard() : setDashOpen(true))} sx={{ fontSize: 12, fontWeight: 700, textTransform: 'none', px: 2, py: 0.75, borderRadius: 2, color: '#fff', backgroundColor: '#3b82f6', '&:hover': { backgroundColor: '#2563eb' } }}>
                Dashboard
              </Button>
              <Button size="small" disableElevation startIcon={<FileDownloadIcon sx={{ fontSize: 14 }} />} onClick={() => (onPdf ? onPdf() : exportPdf())} sx={{ fontSize: 12, fontWeight: 700, textTransform: 'none', px: 2, py: 0.75, borderRadius: 2, color: '#fff', backgroundColor: '#ef4444', '&:hover': { backgroundColor: '#dc2626' } }}>
                Gerar PDF
              </Button>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1.5, fontSize: 11, color: 'rgba(255,255,255,0.9)' }}>
            {legend.map(([color, label]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
                {`${label} km/h`}
              </span>
            ))}
          </Box>
        </>
      )}
      <Dialog open={dashOpen} onClose={() => setDashOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Resumo do percurso</DialogTitle>
        <DialogContent>
          {summarize(positions) ? (
            <Stack spacing={1.25} sx={{ pb: 1, fontSize: 14 }}>
              <div>Distancia: <b>{summarize(positions).km} km</b></div>
              <div>Velocidade maxima: <b>{summarize(positions).max} km/h</b></div>
              <div>Velocidade media: <b>{summarize(positions).avg} km/h</b></div>
              <div>Duracao: <b>{summarize(positions).duration}</b></div>
              <div>Paradas: <b>{stats ? stats.stops : 0}</b></div>
              <div>Inicio: <b>{summarize(positions).first}</b></div>
              <div>Fim: <b>{summarize(positions).last}</b></div>
            </Stack>
          ) : <div>Sem dados no periodo.</div>}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default HistoryPanel;




