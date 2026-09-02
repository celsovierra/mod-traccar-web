import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  IconButton,
  Tooltip,
  Box,
  Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HubIcon from '@mui/icons-material/Hub';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import LinkField from '../common/components/LinkField';
import { useTranslation } from '../common/components/LocalizationProvider';
import SettingsMenu from './components/SettingsMenu';
import { formatNotificationTitle } from '../common/util/formatter';
import PageLayout from '../common/components/PageLayout';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useCatch } from '../reactHelper';

const UserConnectionsPage = () => {
  const t = useTranslation();
  const { id } = useParams();

  const [user, setUser] = useState(null);
  const [loadingTest, setLoadingTest] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState('connections');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const userRes = await fetchOrThrow(`/api/users/${id}`);
        const userData = await userRes.json();
        setUser(userData);
      } catch (e) {
        // Ignora erro
      }
    };
    loadInitialData();
  }, [id]);

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
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
              <LinkField
                endpointAll="/api/notifications?all=true"
                endpointLinked={`/api/notifications?userId=${id}`}
                baseId={id}
                keyBase="userId"
                keyLink="notificationId"
                titleGetter={(it) => `${formatNotificationTitle(t, it)} [${it.id}]`}
                label={t('sharedNotifications')}
                fullWidth
              />
            </AccordionDetails>
          </Accordion>
        </Paper>
      </Box>
    </PageLayout>
  );
};

export default UserConnectionsPage;