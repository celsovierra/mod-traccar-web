import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
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
  Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import HubIcon from '@mui/icons-material/Hub';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import LinkField from '../common/components/LinkField';
import { useTranslation } from '../common/components/LocalizationProvider';
import SettingsMenu from './components/SettingsMenu';
import { formatNotificationTitle } from '../common/util/formatter';
import PageLayout from '../common/components/PageLayout';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useCatch } from '../reactHelper';

const REQUIRED_TYPES = ['ignitionOn', 'ignitionOff', 'geofenceExit'];

const UserConnectionsPage = () => {
  const t = useTranslation();
  const { id } = useParams();

  const [user, setUser] = useState(null);
  const [devices, setDevices] = useState([]);
  const [userNotifications, setUserNotifications] = useState([]);
  const [deviceNotificationMap, setDeviceNotificationMap] = useState({});
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingTest, setLoadingTest] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const [expandedPanel, setExpandedPanel] = useState('connections');

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingDevices(true);
      try {
        const [userRes, devicesRes, allNotifsRes, userNotifsRes] = await Promise.all([
          fetchOrThrow(`/api/users/${id}`),
          fetchOrThrow(`/api/devices?userId=${id}&excludeAttributes=true`),
          fetchOrThrow('/api/notifications'),
          fetchOrThrow(`/api/notifications?userId=${id}`),
        ]);

        const userData = await userRes.json();
        const devicesData = await devicesRes.json();
        const allNotifs = await allNotifsRes.json();
        const userNotifs = await userNotifsRes.json();

        const resolvedUserNotifs = [];

        for (const type of REQUIRED_TYPES) {
          let notif = userNotifs.find((n) => n.type === type);

          if (!notif) {
            notif = allNotifs.find((n) => n.type === type);
            if (notif) {
              await fetchOrThrow('/api/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: Number(id), notificationId: notif.id }),
              }).catch(() => {});
            } else {
              const createRes = await fetchOrThrow('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, notificators: 'firebase', always: false }),
              });
              notif = await createRes.json();
              await fetchOrThrow('/api/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: Number(id), notificationId: notif.id }),
              });
            }
          }

          if (notif && !resolvedUserNotifs.some((n) => n.id === notif.id)) {
            resolvedUserNotifs.push(notif);
          }
        }

        const targetNotifIds = new Set(resolvedUserNotifs.map((n) => n.id));
        const links = {};
        await Promise.all(
          devicesData.map(async (device) => {
            const res = await fetchOrThrow(`/api/notifications?deviceId=${device.id}`);
            const linked = await res.json();
            const filteredLinked = linked.filter((it) => targetNotifIds.has(it.id));
            links[device.id] = new Set(filteredLinked.map((item) => item.id));
          })
        );

        setUser(userData);
        setDevices(devicesData);
        setUserNotifications(resolvedUserNotifs);
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

    await fetchOrThrow('/api/permissions', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, notificationId }),
    });

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
      });
      alert('Notificação de teste enviada!');
    } finally {
      setLoadingTest(false);
    }
  });

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'settingsUser', 'sharedConnections']}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 480,
          mx: 'auto',
          p: { xs: 1.5, sm: 2 },
          '& .MuiOutlinedInput-root': {
            borderRadius: '14px',
            backgroundColor: '#f9fafb',
            transition: 'all 0.2s',
            '&:hover': { backgroundColor: '#ffffff' },
            '&.Mui-focused': {
              backgroundColor: '#ffffff',
              boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.15)',
            },
          },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            borderRadius: '20px',
            mb: 2.5,
            border: '1px solid #edf2f7',
            boxShadow: '0 8px 24px rgba(149, 157, 165, 0.08)',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
          }}
        >
          <Accordion
            expanded={expandedPanel === 'connections'}
            onChange={handleAccordionChange('connections')}
            sx={{
              boxShadow: 'none',
              backgroundColor: 'transparent',
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#7c3aed' }} />}
              sx={{
                px: 2.5,
                py: 1,
                backgroundColor: expandedPanel === 'connections' ? '#f5f3ff' : '#ffffff',
                transition: 'background-color 0.2s',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1, gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap', minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      backgroundColor: expandedPanel === 'connections' ? '#ede9fe' : '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <HubIcon sx={{ fontSize: 20, color: '#7c3aed' }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.98rem', whiteSpace: 'nowrap' }}>
                    {t('sharedConnections')}
                  </Typography>

                  {user && (
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.6,
                        backgroundColor: '#ede9fe',
                        color: '#7c3aed',
                        px: 1.2,
                        py: 0.3,
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        maxWidth: { xs: 130, sm: 180 },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <PersonIcon sx={{ fontSize: 16 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name || user.email}</span>
                    </Box>
                  )}
                </Box>

                <Tooltip title="Testar Notificação Firebase">
                  <IconButton
                    size="small"
                    onClick={handleSendTestNotification}
                    disabled={loadingTest}
                    sx={{
                      color: '#7c3aed',
                      backgroundColor: '#ede9fe',
                      flexShrink: 0,
                      '&:hover': { backgroundColor: '#ddd6fe' },
                    }}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <LinkField
                endpointAll="/api/devices?all=true&excludeAttributes=true"
                endpointLinked={`/api/devices?userId=${id}&excludeAttributes=true`}
                baseId={id}
                keyBase="userId"
                keyLink="deviceId"
                titleGetter={(it) => `${it.name} (${it.uniqueId})`}
                label={t('deviceTitle')}
                fullWidth
              />
              <LinkField
                endpointAll="/api/geofences?all=true"
                endpointLinked={`/api/geofences?userId=${id}`}
                baseId={id}
                keyBase="userId"
                keyLink="geofenceId"
                label={t('sharedGeofences')}
                fullWidth
              />
            </AccordionDetails>
          </Accordion>
        </Paper>

        <Box sx={{ mt: 3 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 1.5,
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  backgroundColor: '#ede9fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <NotificationsActiveIcon sx={{ color: '#7c3aed', fontSize: 18 }} />
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.96rem', color: '#1e293b' }}>
                Notificações por Veículo
              </Typography>
            </Box>

            <TextField
              size="small"
              placeholder={t('sharedSearch')}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              sx={{ width: { xs: '100%', sm: 190 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
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
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} sx={{ color: '#7c3aed' }} />
            </Box>
          ) : filteredDevices.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                textAlign: 'center',
                borderRadius: '18px',
                border: '1px solid #edf2f7',
                backgroundColor: '#f8fafc',
              }}
            >
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                {devices.length === 0 ? 'Nenhum veículo vinculado a este usuário.' : 'Nenhum veículo encontrado.'}
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {filteredDevices.map((device) => {
                const isPanelOpen = expandedPanel === `device-${device.id}`;
                const linkedNotifs = deviceNotificationMap[device.id] || new Set();

                return (
                  <Paper
                    key={device.id}
                    elevation={0}
                    sx={{
                      borderRadius: '18px',
                      border: '1px solid #edf2f7',
                      boxShadow: '0 4px 16px rgba(149, 157, 165, 0.05)',
                      overflow: 'hidden',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <Accordion
                      expanded={isPanelOpen}
                      onChange={handleAccordionChange(`device-${device.id}`)}
                      sx={{
                        boxShadow: 'none',
                        backgroundColor: 'transparent',
                        '&:before': { display: 'none' },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ color: '#7c3aed' }} />}
                        sx={{
                          px: 2,
                          py: 0.8,
                          backgroundColor: isPanelOpen ? '#f5f3ff' : '#ffffff',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <DirectionsCarFilledIcon sx={{ color: isPanelOpen ? '#7c3aed' : '#64748b', fontSize: 20 }} />
                          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                            {device.name}
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 1.5, backgroundColor: '#fbfbfe', borderTop: '1px solid #f1f5f9' }}>
                        <List dense disablePadding>
                          {userNotifications.map((item, index) => (
                            <Box key={item.id}>
                              <ListItem disableGutters sx={{ py: 0.6, px: 1 }}>
                                <ListItemText
                                  primary={formatNotificationTitle(t, item, false)}
                                  primaryTypographyProps={{ variant: 'caption', fontWeight: 600, color: '#334155' }}
                                />
                                <ListItemSecondaryAction>
                                  <Switch
                                    edge="end"
                                    size="small"
                                    checked={linkedNotifs.has(item.id)}
                                    onChange={() => handleToggleDeviceNotification(device.id, item.id)}
                                    sx={{
                                      '& .MuiSwitch-switchBase.Mui-checked': {
                                        color: '#7c3aed',
                                      },
                                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                        backgroundColor: '#7c3aed',
                                      },
                                    }}
                                  />
                                </ListItemSecondaryAction>
                              </ListItem>
                              {index < userNotifications.length - 1 && <Divider sx={{ borderColor: '#f1f5f9' }} />}
                            </Box>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </PageLayout>
  );
};

export default UserConnectionsPage;