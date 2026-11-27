import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, Button, Chip, Dialog, Typography } from '@mui/material';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import PlaceIcon from '@mui/icons-material/Place';
import AnchorIcon from '@mui/icons-material/Anchor';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useTranslation } from './LocalizationProvider';
import fetchOrThrow from '../util/fetchOrThrow';
import { formatTime } from '../util/formatter';
import { prefixString } from '../util/stringUtils';

const customLabels = {
  anchorActivated: 'Ancora Ativada',
  anchorDeactivated: 'Ancora Desativada',
  anchorExited: 'Saiu da Ancora',
  deviceBlocked: 'Bloqueado',
  deviceUnblocked: 'Desbloqueado',
};

const cfg = {
  ignitionOn: { icon: VpnKeyIcon, color: 'success' },
  ignitionOff: { icon: VpnKeyIcon, color: 'error' },
  alarm: { icon: NotificationsActiveIcon, color: 'warning' },
  deviceStopped: { icon: PauseCircleIcon, color: 'info' },
  deviceMoving: { icon: DirectionsCarIcon, color: 'primary' },
  deviceOnline: { icon: WifiIcon, color: 'success' },
  deviceOffline: { icon: WifiOffIcon, color: 'error' },
  geofenceEnter: { icon: PlaceIcon, color: 'success' },
  geofenceExit: { icon: PlaceIcon, color: 'warning' },
  anchorActivated: { icon: AnchorIcon, color: 'success' },
  anchorDeactivated: { icon: AnchorIcon, color: 'default' },
  anchorExited: { icon: AnchorIcon, color: 'error' },
  deviceBlocked: { icon: LockIcon, color: 'error' },
  deviceUnblocked: { icon: LockOpenIcon, color: 'success' },
};

const DeviceReportDialog = ({ deviceId, open, onClose }) => {
  const t = useTranslation();
  const device = useSelector((state) => state.devices.items[deviceId]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [periodo, setPeriodo] = useState('hoje');

  const getLabel = (type) => customLabels[type] || t(prefixString('event', type));

  useEffect(() => {
    if (!open || !deviceId) return;
    const load = async () => {
      setLoading(true);
      try {
        const to = new Date();
        const from = new Date();
        from.setHours(0, 0, 0, 0);
        if (periodo === 'ontem') {
          from.setDate(from.getDate() - 1);
          to.setTime(from.getTime());
          to.setHours(23, 59, 59, 999);
        } else if (periodo === '7d') {
          from.setDate(from.getDate() - 6);
        } else if (periodo === '30d') {
          from.setDate(from.getDate() - 29);
        }
        const q = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
        q.append('deviceId', deviceId);
        const resp = await fetchOrThrow('/api/reports/combined?' + q.toString());
        const data = await resp.json();
        let list = data.length ? data[0].events || [] : [];
        try {
          const ev = await fetch(
            '/api-device-event/' + deviceId + '?from=' + q.get('from') + '&to=' + q.get('to'),
          );
          if (ev.ok) {
            const custom = await ev.json();
            const proprios = [
              'anchorActivated',
              'anchorDeactivated',
              'anchorExited',
              'deviceBlocked',
              'deviceUnblocked',
            ];
            list = [
              ...list.filter((e) => !proprios.includes(e.type)),
              ...custom.map((e) => ({
                id: 'c' + e.id,
                type: e.type,
                eventTime: new Date(e.eventtime).getTime(),
                attributes: {
                  role: e.attributes
                    ? (typeof e.attributes === 'string'
                        ? JSON.parse(e.attributes || '{}')
                        : e.attributes
                      ).role
                    : undefined,
                },
              })),
            ];
          }
        } catch (err) {
          console.warn(err);
        }
        list.sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime));
        setEvents(list);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, deviceId, periodo]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: '16px', m: 1, maxHeight: '85vh' } }}
    >
      <Box sx={{ px: 2, py: 1.5, bgcolor: '#f4f4f5', borderBottom: '1px solid #e5e7eb' }}>
        <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>
          {device?.name || ''}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap' }}>
          {[
            ['hoje', 'Hoje'],
            ['ontem', 'Ontem'],
            ['7d', '7 dias'],
            ['30d', '30 dias'],
          ].map(([k, n]) => (
            <Chip
              key={k}
              size="small"
              label={n}
              clickable
              onClick={() => setPeriodo(k)}
              color={periodo === k ? 'primary' : 'default'}
              variant={periodo === k ? 'filled' : 'outlined'}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Box>
      </Box>
      <Box sx={{ overflowY: 'auto', flex: 1, bgcolor: '#fff' }}>
        {loading && <Typography sx={{ p: 2, color: '#6b7280' }}>Carregando...</Typography>}
        {!loading && events.length === 0 && (
          <Typography sx={{ p: 2, color: '#6b7280' }}>Nenhum evento hoje.</Typography>
        )}
        {events.map((ev) => {
          const c = cfg[ev.type] || { icon: NotificationsNoneIcon, color: 'default' };
          const Icon = c.icon;
          const label =
            ev.type === 'alarm' && ev.attributes?.alarm
              ? t(prefixString('alarm', ev.attributes.alarm))
              : getLabel(ev.type);
          return (
            <Box
              key={ev.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                px: 2,
                py: 1.2,
                borderBottom: '1px solid #eef0f2',
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>
                {formatTime(ev.eventTime, 'seconds')}
              </Typography>
              {ev.attributes?.role && (
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: 11,
                    color: ev.attributes.role === 'admin' ? '#ea580c' : '#2563eb',
                  }}
                >
                  {ev.attributes.role === 'admin' ? 'ADM' : 'USER'}
                </Typography>
              )}
              <Chip
                size="small"
                variant="outlined"
                icon={<Icon />}
                label={label}
                color={c.color}
                sx={{ fontWeight: 600 }}
              />
            </Box>
          );
        })}
      </Box>
      <Box sx={{ p: 1.5, borderTop: '1px solid #e5e7eb', bgcolor: '#fff' }}>
        <Button
          fullWidth
          variant="contained"
          color="error"
          onClick={onClose}
          sx={{ fontWeight: 700, borderRadius: '10px' }}
        >
          Fechar
        </Button>
      </Box>
    </Dialog>
  );
};

export default DeviceReportDialog;
