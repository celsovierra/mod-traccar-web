import { Divider, List, Box } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';
import DnsIcon from '@mui/icons-material/Dns';
import DrawIcon from '@mui/icons-material/Draw';
import HelpIcon from '@mui/icons-material/Help';
import PaymentIcon from '@mui/icons-material/Payment';
import CampaignIcon from '@mui/icons-material/Campaign';
import PeopleIcon from '@mui/icons-material/People';
import ConstructionIcon from '@mui/icons-material/Construction';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useManager, useRestriction } from '../../common/util/permissions';
import useFeatures from '../../common/util/useFeatures';
import MenuItem from '../../common/components/MenuItem';

const SettingsMenu = () => {
  const t = useTranslation();
  const location = useLocation();

  const readonly = useRestriction('readonly');
  const manager = useManager();
  const userId = useSelector((state) => state.session.user.id);
  const supportLink = useSelector((state) => state.session.server.attributes.support);
  const billingLink = useSelector((state) => state.session.user.attributes.billingLink);

  const features = useFeatures();

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: '#ffffff',
        py: 1,
        '& .MuiListItemButton-root': {
          my: 0.4,
          mx: 1.2,
          borderRadius: '14px',
          py: 0.9,
          px: 1.5,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: '#f8fafc',
            transform: 'translateX(3px)',
          },
          '&.Mui-selected': {
            backgroundColor: '#ede9fe',
            color: '#6d28d9',
            '& .MuiListItemIcon-root': {
              color: '#7c3aed',
            },
            '&:hover': {
              backgroundColor: '#e0e7ff',
            },
          },
        },
        '& .MuiListItemIcon-root': {
          minWidth: 38,
          color: '#64748b',
          transition: 'color 0.2s',
        },
        '& .MuiListItemText-primary': {
          fontSize: '0.88rem',
          fontWeight: 600,
        },
      }}
    >
      <List disablePadding>
        {!readonly && (
          <>
            <MenuItem
              title={t('sharedNotifications')}
              link="/settings/notifications"
              icon={<NotificationsIcon fontSize="small" />}
              selected={location.pathname.startsWith('/settings/notification')}
            />
            <MenuItem
              title={t('settingsUser')}
              link={`/settings/user/${userId}`}
              icon={<PersonIcon fontSize="small" />}
              selected={location.pathname === `/settings/user/${userId}`}
            />
            <MenuItem
              title={t('deviceTitle')}
              link="/settings/devices"
              icon={<DnsIcon fontSize="small" />}
              selected={location.pathname.startsWith('/settings/device')}
            />
            <MenuItem
              title={t('sharedGeofences')}
              link="/geofences"
              icon={<DrawIcon fontSize="small" />}
              selected={location.pathname.startsWith('/settings/geofence')}
            />
            {!features.disableSavedCommands && (
              <MenuItem
                title={t('sharedSavedCommands')}
                link="/settings/commands"
                icon={<SendIcon fontSize="small" />}
                selected={location.pathname.startsWith('/settings/command')}
              />
            )}
          </>
        )}
        {billingLink && (
          <MenuItem title={t('userBilling')} link={billingLink} icon={<PaymentIcon fontSize="small" />} />
        )}
        {supportLink && (
          <MenuItem title={t('settingsSupport')} link={supportLink} icon={<HelpIcon fontSize="small" />} />
        )}
      </List>

      {manager && (
        <>
          <Divider sx={{ my: 1.5, mx: 1.5, borderColor: '#f1f5f9' }} />
          <List disablePadding>
            <MenuItem
              title={t('serverAnnouncement')}
              link="/settings/announcement"
              icon={<CampaignIcon fontSize="small" />}
              selected={location.pathname === '/settings/announcement'}
            />
            <MenuItem
              title={t('settingsUsers')}
              link="/settings/users"
              icon={<PeopleIcon fontSize="small" />}
              selected={
                location.pathname.startsWith('/settings/user') &&
                location.pathname !== `/settings/user/${userId}`
              }
            />
            <MenuItem
              title="Ferramentas"
              link="/settings/tools"
              icon={<ConstructionIcon fontSize="small" />}
              selected={location.pathname === '/settings/tools'}
            />
          </List>
        </>
      )}
    </Box>
  );
};

export default SettingsMenu;