import { useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Stack, TextField } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const pill = (active) => ({
  fontSize: 11,
  fontWeight: 700,
  minWidth: 0,
  px: 1.75,
  py: 0.5,
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

const HistoryPanel = ({ positions, loading, onSelect, onDashboard, onPdf }) => {
  const [period, setPeriod] = useState(null);
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

  const legend = [
    ['#22c55e', '0-40'],
    ['#f97316', '41-80'],
    ['#ef4444', '81-110'],
    ['#7f1d1d', '+110'],
  ];

  return (
    <Box sx={{ mx: -2, mt: -2, mb: 1, px: 1.5, py: 1, backgroundColor: '#0f172a', color: '#fff' }}>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', fontSize: 10.5, color: 'rgba(255,255,255,0.7)' }}>
            <span>{`\u{1F4CD} ${stats.points} pontos`}</span>
            <span style={{ color: '#fb923c' }}>{`\u23F1 ${stats.stops} paradas`}</span>
            <span>{`\u25CF ${stats.first}`}</span>
            <span>{`\u25CF ${stats.last}`}</span>
            <Box sx={{ ml: 'auto', display: 'flex', gap: 0.75 }}>
              <Button size="small" disableElevation startIcon={<BarChartIcon sx={{ fontSize: 14 }} />} onClick={() => onDashboard && onDashboard()} sx={{ fontSize: 10, fontWeight: 700, textTransform: 'none', px: 1.25, py: 0.4, borderRadius: 1.5, color: '#fff', backgroundColor: '#3b82f6', '&:hover': { backgroundColor: '#2563eb' } }}>
                Dashboard
              </Button>
              <Button size="small" disableElevation startIcon={<FileDownloadIcon sx={{ fontSize: 14 }} />} onClick={() => onPdf && onPdf()} sx={{ fontSize: 10, fontWeight: 700, textTransform: 'none', px: 1.25, py: 0.4, borderRadius: 1.5, color: '#fff', backgroundColor: '#ef4444', '&:hover': { backgroundColor: '#dc2626' } }}>
                Gerar PDF
              </Button>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 1, fontSize: 9.5, color: 'rgba(255,255,255,0.8)' }}>
            {legend.map(([color, label]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
                {`${label} km/h`}
              </span>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

export default HistoryPanel;
