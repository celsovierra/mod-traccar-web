import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import FolderIcon from '@mui/icons-material/Folder';
import PersonIcon from '@mui/icons-material/Person';
import TodayIcon from '@mui/icons-material/Today';
import CalculateIcon from '@mui/icons-material/Calculate';
import BuildIcon from '@mui/icons-material/Build';
import StorageIcon from '@mui/icons-material/Storage';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAdministrator, useRestriction } from '../common/util/permissions';
import useFeatures from '../common/util/useFeatures';

const ToolsPage = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const admin = useAdministrator();
  const readonly = useRestriction('readonly');
  const features = useFeatures();

  const toolItems = [
    {
      title: t('sharedPreferences'),
      description: 'Preferências do mapa, notificações sonoras e atributos',
      link: '/settings/preferences',
      icon: <TuneIcon sx={{ fontSize: 24, color: '#7c3aed' }} />,
      bg: '#ede9fe',
      show: true,
    },
    {
      title: t('settingsGroups'),
      description: 'Gerenciamento e organização de grupos de veículos',
      link: '/settings/groups',
      icon: <FolderIcon sx={{ fontSize: 24, color: '#2563eb' }} />,
      bg: '#dbeafe',
      show: !readonly && !features.disableGroups,
    },
    {
      title: t('sharedDrivers'),
      description: 'Cadastro e vínculo de condutores e motoristas',
      link: '/settings/drivers',
      icon: <PersonIcon sx={{ fontSize: 24, color: '#059669' }} />,
      bg: '#d1fae5',
      show: !readonly && !features.disableDrivers,
    },
    {
      title: t('sharedCalendars'),
      description: 'Definição de calendários e regras de horários',
      link: '/settings/calendars',
      icon: <TodayIcon sx={{ fontSize: 24, color: '#d97706' }} />,
      bg: '#fef3c7',
      show: !readonly && !features.disableCalendars,
    },
    {
      title: t('sharedComputedAttributes'),
      description: 'Cálculos e expressões para atributos computados',
      link: '/settings/attributes',
      icon: <CalculateIcon sx={{ fontSize: 24, color: '#0284c7' }} />,
      bg: '#e0f2fe',
      show: !readonly && !features.disableComputedAttributes,
    },
    {
      title: t('sharedMaintenance'),
      description: 'Controle de revisões, trocas de óleo e serviços',
      link: '/settings/maintenances',
      icon: <BuildIcon sx={{ fontSize: 24, color: '#ea580c' }} />,
      bg: '#ffedd5',
      show: !readonly && !features.disableMaintenance,
    },
    {
      title: t('settingsServer'),
      description: 'Configurações globais e status do servidor Traccar',
      link: '/settings/server',
      icon: <StorageIcon sx={{ fontSize: 24, color: '#dc2626' }} />,
      bg: '#fee2e2',
      show: admin,
    },
  ];

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'Ferramentas']}>
      <Box sx={{ width: '100%', maxWidth: 760, mx: 'auto', p: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
            Central de Ferramentas
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Acesse as configurações avançadas e os módulos do sistema
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {toolItems.filter((it) => it.show).map((item) => (
            <Grid item xs={12} sm={6} key={item.link}>
              <Paper
                elevation={0}
                onClick={() => navigate(item.link)}
                sx={{
                  p: 2,
                  borderRadius: '20px',
                  border: '1px solid #edf2f7',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(124, 58, 237, 0.12)',
                    borderColor: '#ddd6fe',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: '14px',
                      backgroundColor: item.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.94rem', color: '#1e293b' }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {item.description}
                    </Typography>
                  </Box>
                </Box>
                <ChevronRightIcon sx={{ color: '#94a3b8' }} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </PageLayout>
  );
};

export default ToolsPage;