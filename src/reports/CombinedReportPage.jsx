import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Chip,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import PlaceIcon from '@mui/icons-material/Place';
import AnchorIcon from '@mui/icons-material/Anchor';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ReportFilter from './components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import { useCatchCallback } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import { formatTime } from '../common/util/formatter';
import { prefixString } from '../common/util/stringUtils';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { deviceEquality } from '../common/util/deviceEquality';

const customEventLabels = {
  anchorActivated: 'Ancora Ativada',
  anchorDeactivated: 'Ancora Desativada',
  anchorExited: 'Saiu da Ancora',
  deviceBlocked: 'Bloqueado',
  deviceUnblocked: 'Desbloqueado',
};

const eventConfig = {
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

const CombinedReportPage = () => {
  const { classes } = useReportStyles();
  const t = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const devices = useSelector((state) => state.devices.items, deviceEquality(['id', 'name']));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const getLabel = (type) => customEventLabels[type] || t(prefixString('event', type));

  const groups = useMemo(
    () =>
      items
        .map((item) => ({
          deviceId: item.deviceId,
          name: devices[item.deviceId]?.name || `#${item.deviceId}`,
          events: [...(item.events || [])].reverse(),
        }))
        .filter((group) => group.events.length > 0),
    [items, devices],
  );

  const onShow = useCatchCallback(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    setLoading(true);
    try {
      const response = await fetchOrThrow(`/api/reports/combined?${query.toString()}`);
      const reportItems = await response.json();
      for (const it of reportItems) {
        try {
          const evRes = await fetch(`/api-device-event/${it.deviceId}?from=${from}&to=${to}`);
          if (evRes.ok) {
            const customEvents = await evRes.json();
            const mapped = customEvents.map((e) => ({
              id: e.id,
              type: e.type,
              eventTime: new Date(e.eventtime).getTime(),
              positionId: 0,
              user: (() => {
                try {
                  return JSON.parse(e.attributes || '{}').user || '';
                } catch {
                  return '';
                }
              })(),
            }));
            it.events = [...(it.events || []), ...mapped];
          }
        } catch (err) {}
      }
      setItems(reportItems);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const renderChip = (type, ev) => {
    const cfg = eventConfig[type] || { icon: NotificationsNoneIcon, color: 'default' };
    const Icon = cfg.icon;
    return (
      <Chip
        size="small"
        variant="outlined"
        icon={<Icon />}
        label={
          type === 'alarm' && ev?.attributes?.alarm
            ? t(prefixString('alarm', ev.attributes.alarm))
            : getLabel(type)
        }
        color={cfg.color}
        sx={{ fontWeight: 600 }}
      />
    );
  };

  const renderEmpty = () => (
    <Box sx={{ textAlign: 'center', py: { xs: 6, md: 10 }, px: 2, color: 'text.secondary' }}>
      <AssessmentOutlinedIcon sx={{ fontSize: 56, opacity: 0.4 }} />
      <Typography variant="h6" sx={{ mt: 1, fontWeight: 600 }}>
        {searched ? 'Nenhum evento encontrado' : 'Nenhum dado ainda'}
      </Typography>
      <Typography variant="body2">
        {searched
          ? 'Tente outro dispositivo ou outro período.'
          : 'Selecione os dispositivos e o período e toque em Mostrar.'}
      </Typography>
    </Box>
  );

  const renderMobile = () => {
    if (loading) {
      return [1, 2, 3].map((n) => (
        <Skeleton key={n} variant="rounded" height={110} sx={{ borderRadius: 3 }} />
      ));
    }
    if (!groups.length) {
      return (
        <Paper variant="outlined" sx={{ borderRadius: 3 }}>
          {renderEmpty()}
        </Paper>
      );
    }
    return groups.map((group) => (
      <Paper key={group.deviceId} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {group.name}
          </Typography>
        </Box>
        {group.events.map((event, index) => (
          <Box
            key={event.id}
            sx={{
              px: 2,
              py: 1.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1,
              borderTop: index ? 1 : 0,
              borderColor: 'divider',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatTime(event.eventTime, 'seconds')}
              </Typography>
              {event.user ? (
                <Typography variant="caption" color="text.secondary" noWrap>
                  Usuario: {event.user}
                </Typography>
              ) : null}
            </Box>
            {renderChip(event.type, event)}
          </Box>
        ))}
      </Paper>
    ));
  };

  const renderDesktop = () => (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                '& .MuiTableCell-head': {
                  bgcolor: 'action.hover',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  color: 'text.secondary',
                },
              }}
            >
              <TableCell>{t('sharedDevice')}</TableCell>
              <TableCell>{t('positionFixTime')}</TableCell>
              <TableCell>{t('sharedType')}</TableCell>
              <TableCell>Usuario</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableShimmer columns={4} />
            ) : (
              groups.flatMap((group) =>
                group.events.map((event, index) => (
                  <TableRow key={event.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{index ? '' : group.name}</TableCell>
                    <TableCell>{formatTime(event.eventTime, 'seconds')}</TableCell>
                    <TableCell>{renderChip(event.type, event)}</TableCell>
                    <TableCell>{event.user || ''}</TableCell>
                  </TableRow>
                )),
              )
            )}
          </TableBody>
        </Table>
      </Box>
      {!loading && !groups.length && renderEmpty()}
    </Paper>
  );

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportCombined']}>
      <div className={classes.container}>
        <div className={classes.containerMain}>
          <Box sx={{ p: { xs: 1.5, md: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 1.5, md: 2 } }}>
              <ReportFilter onShow={onShow} deviceType="multiple" loading={loading} hideGroups />
            </Paper>
            {isMobile ? renderMobile() : renderDesktop()}
          </Box>
        </div>
      </div>
    </PageLayout>
  );
};

export default CombinedReportPage;
