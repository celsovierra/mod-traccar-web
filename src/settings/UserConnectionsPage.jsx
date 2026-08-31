import { useEffect, useState } from 'react';
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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
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

  const [notifications, setNotifications] = useState([]);
  const [linkedIds, setLinkedIds] = useState(new Set());
  const [loadingTest, setLoadingTest] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      const [allRes, linkedRes] = await Promise.all([
        fetchOrThrow('/api/notifications?all=true'),
        fetchOrThrow(`/api/notifications?userId=${id}`),
      ]);
      const allData = await allRes.json();
      const linkedData = await linkedRes.json();
      setNotifications(allData);
      setLinkedIds(new Set(linkedData.map((item) => item.id)));
    };
    loadNotifications();
  }, [id]);

  const handleToggleNotification = async (notificationId) => {
    const isLinked = linkedIds.has(notificationId);
    const method = isLinked ? 'DELETE' : 'POST';

    await fetchOrThrow('/api/permissions', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: Number(id), notificationId }),
    });

    setLinkedIds((prev) => {
      const updated = new Set(prev);
      if (isLinked) {
        updated.delete(notificationId);
      } else {
        updated.add(notificationId);
      }
      return updated;
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

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
              {t('sharedNotifications')}
            </Typography>
            <List dense disablePadding>
              {notifications.map((item, index) => (
                <div key={item.id}>
                  <ListItem disableGutters>
                    <ListItemText primary={formatNotificationTitle(t, item, true)} />
                    <ListItemSecondaryAction>
                      <Switch
                        edge="end"
                        size="small"
                        checked={linkedIds.has(item.id)}
                        onChange={() => handleToggleNotification(item.id)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </div>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      </Container>
    </PageLayout>
  );
};

export default UserConnectionsPage;