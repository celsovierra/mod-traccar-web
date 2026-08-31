import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Container,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
  IconButton,
  Tooltip,
  Box,
  CircularProgress,
  TextField,
  InputAdornment,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import LinkField from '../common/components/LinkField';
import { useTranslation } from '../common/components/LocalizationProvider';
import SettingsMenu from './components/SettingsMenu';
import { formatNotificationTitle } from '../common/util/formatter';
import PageLayout from '../common/components/PageLayout';
import useSettingsStyles from './common/useSettingsStyles';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useCatch } from '../reactHelper';

const UserConnectionsPage = () => {
  const { classes } = useSettingsStyles();
  const t = useTranslation();
  const { id } = useParams();

  const [devices, setDevices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [deviceNotificationMap, setDeviceNotificationMap] = useState({});
  const [userNotificationIds, setUserNotificationIds] = useState(new Set());
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingTest, setLoadingTest] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingDevices(true);
      try {
        const [devicesRes, notificationsRes, userNotifsRes] = await Promise.all([
          fetchOrThrow(`/api/devices?userId=${id}&excludeAttributes=true`),
          fetchOrThrow('/api/notifications?all=true'),
          fetchOrThrow(`/api/notifications?userId=${id}`),
        ]);

        const devicesData = await devicesRes.json();
        const notificationsData = await notificationsRes.json();
        const userNotifsData = await userNotifsRes.json();

        setDevices(devicesData);
        setNotifications(notificationsData);
        setUserNotificationIds(new Set(userNotifsData.map((item) => item.id)));

        const links = {};
        await Promise.all(
          devicesData.map(async (device) => {
            const res = await fetchOrThrow(`/api/notifications?deviceId=${device.id}`);
            const linked = await res.json();
            links[device.id] = new Set(linked.map((item) => item.id));
          })
        );
        setDeviceNotificationMap(links);
      } finally {
        setLoadingDevices(false);
      }
    };

    loadInitialData();
  }, [id]);

  const filteredDevices = useMemo(() => {
    if (!searchFilter.trim()) return devices;
    const query = searchFilter.toLowerCase();
    return devices.filter(
      (device) =>
        (device.name && device.name.toLowerCase().includes(query)) ||
        (device.uniqueId && device.uniqueId.toLowerCase().includes(query))
    );
  }, [devices, searchFilter]);

  const handleToggleDeviceNotification = async (deviceId, notificationId) => {
    const currentSet = deviceNotificationMap[deviceId] || new Set();
    const isLinked = currentSet.has(notificationId);
    const method = isLinked ? 'DELETE' : 'POST';

    // 1. Atualiza permissão no dispositivo
    await fetchOrThrow('/api/permissions', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, notificationId }),
    });

    // 2. Garante permissão vinculada também no usuário
    if (!isLinked && !userNotificationIds.has(notificationId)) {
      await fetchOrThrow('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: Number(id), notificationId }),
      }).catch(() => {});

      setUserNotificationIds((prev) => new Set([...prev, notificationId]));
    }

    setDeviceNotificationMap((prev) => {
      const updatedSet = new Set(prev[deviceId] || []);
      if (isLinked) {
        updatedSet.delete(notificationId);
      } else {
        updatedSet.add(notificationId);
      }
      return { ...prev, [deviceId]: updatedSet };
    });
  };

  const handleSendTestNotification = useCatch(async (event) => {
    event.stopPropagation();
    setLoadingTest(true);
    try {
      await fetchOrThrow('/api/notifications/test/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: Number(id) }),
      });
      alert('Notificação de teste enviada com sucesso!');
    } finally {
      setLoadingTest(false);
    }
  });

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'settingsUser', 'sharedConnections']}
    >
      <Container maxWidth="xs" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
              <Typography variant="subtitle1">{t('sharedConnections')}</Typography>
              <Tooltip title="Testar Notificação Firebase">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={handleSendTestNotification}
                  disabled={loadingTest}
                >
                  <NotificationsActiveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </AccordionSummary>
          <AccordionDetails className={classes.details}>
            <LinkField
              endpointAll="/api/devices?all=true&excludeAttributes=true"
              endpointLinked={`/api/devices?userId=${id}&excludeAttributes=true`}
              baseId={id}
              keyBase="userId"
              keyLink="deviceId"
              titleGetter={(it) => `${it.name} (${it.uniqueId})`}
              label={t('deviceTitle')}
            />
            <LinkField
              endpointAll="/api/geofences?all=true"
              endpointLinked={`/api/geofences?userId=${id}`}
              baseId={id}
              keyBase="userId"
              keyLink="geofenceId"
              label={t('sharedGeofences')}
            />
          </AccordionDetails>
        </Accordion>

        <Box sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            Notificações por Veículo
          </Typography>
          <TextField
            size="small"
            placeholder={t('sharedSearch')}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            sx={{ maxWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searchFilter ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchFilter('')} edge="end">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        </Box>

        {loadingDevices ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : filteredDevices.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ px: 1, py: 1 }}>
            {devices.length === 0 ? 'Nenhum veículo vinculado a este usuário.' : 'Nenhum veículo encontrado.'}
          </Typography>
        ) : (
          filteredDevices.map((device) => {
            const linkedNotifs = deviceNotificationMap[device.id] || new Set();
            return (
              <Accordion key={device.id} disableGutters sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DirectionsCarIcon fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {device.name}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                  <List dense disablePadding>
                    {notifications.map((item, index) => (
                      <div key={item.id}>
                        <ListItem disableGutters>
                          <ListItemText
                            primary={formatNotificationTitle(t, item, true)}
                            primaryTypographyProps={{ variant: 'caption' }}
                          />
                          <ListItemSecondaryAction>
                            <Switch
                              edge="end"
                              size="small"
                              checked={linkedNotifs.has(item.id)}
                              onChange={() => handleToggleDeviceNotification(device.id, item.id)}
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < notifications.length - 1 && <Divider />}
                      </div>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            );
          })
        )}
      </Container>
    </PageLayout>
  );
};

export default UserConnectionsPage;

