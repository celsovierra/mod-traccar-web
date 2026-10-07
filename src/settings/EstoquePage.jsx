import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Container, Typography, Box, Paper, List, ListItem, ListItemText,
  Chip, FormControlLabel, Switch, Button,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()((theme) => ({
  root: { padding: theme.spacing(2), height: '100%', overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', gap: theme.spacing(1), marginBottom: theme.spacing(2) },
  item: { borderRadius: 12, marginBottom: 6 },
  nome: { fontWeight: 700, color: '#1e293b' },
}));

const EstoquePage = () => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const devices = useSelector((state) => state.devices.items);
  const [showOnMap, setShowOnMap] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('stockShowOnMap') === 'true';
    setShowOnMap(saved);
    window.dispatchEvent(new CustomEvent('stockMapToggle', { detail: saved }));
  }, []);

  const emEstoque = useMemo(() => (
    Object.values(devices).filter((d) => d.attributes && d.attributes.stock === true)
  ), [devices]);

  const toggleMapa = (v) => {
    setShowOnMap(v);
    localStorage.setItem('stockShowOnMap', String(v));
    window.dispatchEvent(new CustomEvent('stockMapToggle', { detail: v }));
  };

  const handleRemover = async (device) => {
    if (!window.confirm('Tirar ' + device.name + ' do estoque?')) return;
    setLoading(true);
    try {
      const updated = { ...device, attributes: { ...device.attributes, stock: false } };
      const r = await fetch('/api/devices/' + device.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(updated),
      });
      if (!r.ok) throw new Error(await r.text());
      window.location.reload();
    } catch (e) {
      alert('Erro: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" className={classes.root}>
      <Box className={classes.header}>
        <Button onClick={() => navigate(-1)} startIcon={<ArrowBackIcon />} sx={{ textTransform: 'none' }}>
          Voltar
        </Button>
        <Inventory2Icon sx={{ fontSize: 32, color: '#f59e0b' }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
          Estoque
        </Typography>
        <Chip label={emEstoque.length + ' veiculo(s)'} sx={{ ml: 'auto', bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700 }} />
      </Box>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 4 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showOnMap}
              onChange={(e) => toggleMapa(e.target.checked)}
            />
          }
          label={<Typography sx={{ fontWeight: 700, color: '#475569' }}>Mostrar veiculos do estoque no mapa</Typography>}
        />
      </Paper>

      {emEstoque.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
          <Typography color="text.secondary">Nenhum veiculo no estoque.</Typography>
          <Typography color="text.secondary" sx={{ fontSize: '0.85rem', mt: 1 }}>
            Para adicionar, edite um veiculo e marque Em Estoque.
          </Typography>
        </Paper>
      ) : (
        <List>
          {emEstoque.map((d) => (
            <Paper key={d.id} className={classes.item}>
              <ListItem>
                <ListItemText
                  primary={<span className={classes.nome}>{d.name}</span>}
                  secondary={'ID: ' + d.uniqueId + (d.attributes && d.attributes.plate ? ' | Placa: ' + d.attributes.plate : '')}
                />
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => handleRemover(d)}
                  disabled={loading}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Remover
                </Button>
              </ListItem>
            </Paper>
          ))}
        </List>
      )}
    </Container>
  );
};

export default EstoquePage;
