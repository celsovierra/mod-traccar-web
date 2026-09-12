import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Paper,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Menu,
  MenuItem,
  Typography,
  Badge,
} from '@mui/material';

import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import MapIcon from '@mui/icons-material/Map';
import PersonIcon from '@mui/icons-material/Person';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

import { sessionActions } from '../../store';
import { useTranslation } from './LocalizationProvider';
import { useRestriction } from '../util/permissions';
import { nativePostMessage } from './NativeInterface';

const BottomMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const disableReports = useRestriction('disableReports');
  const devices = useSelector((state) => state.devices.items);
  const user = useSelector((state) => state.session.user);
  const socket = useSelector((state) => state.session.socket);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const [anchorEl, setAnchorEl] = useState(null);

  const currentSelection = () => {
    if (location.pathname === `/settings/user/${user.id}`) {
      return 'account';
    }
    if (location.pathname.startsWith('/settings')) {
      return 'settings';
    }
    if (location.pathname.startsWith('/reports')) {
      return 'reports';
    }
    if (location.pathname === '/') {
      return 'map';
    }
    return null;
  };

  const handleAccount = () => {
    setAnchorEl(null);
    navigate(`/settings/user/${user.id}`);
  };

  const handleLogout = async () => {
    setAnchorEl(null);

    const notificationToken = window.localStorage.getItem('notificationToken');
    if (notificationToken && !user.readonly) {
      window.localStorage.removeItem('notificationToken');
      const tokens = user.attributes.notificationTokens?.split(',') || [];
      if (tokens.includes(notificationToken)) {
        const updatedUser = {
          ...user,
          attributes: {
            ...user.attributes,
            notificationTokens:
              tokens.length > 1
                ? tokens.filter((it) => it !== notificationToken).join(',')
                : undefined,
          },
        };
        await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser),
        });
      }
    }

    await fetch('/api/session', { method: 'DELETE' });
    nativePostMessage('logout');
    navigate('/login');
    dispatch(sessionActions.updateUser(null));
  };

  const handleSelection = (event, value) => {
    switch (value) {
      case 'map':
        navigate('/');
        break;
      case 'reports': {
        let id = selectedDeviceId;
        if (id == null) {
          const deviceIds = Object.keys(devices);
          if (deviceIds.length === 1) {
            id = deviceIds[0];
          }
        }

        if (id != null) {
          navigate(`/reports/combined?deviceId=${id}`);
        } else {
          navigate('/reports/combined');
        }
        break;
      }
      case 'settings':
        navigate('/settings/preferences?menu=true');
        break;
      case 'account':
        setAnchorEl(event.currentTarget);
        break;
      case 'logout':
        handleLogout();
        break;
      default:
        break;
    }
  };

  return (
    <Paper
      square
      elevation={0}
      sx={{
        borderTop: '1px solid #edf0f4',
        boxShadow: '0 -4px 18px rgba(15,23,42,0.08)',
      }}
    >
      <BottomNavigation
        value={currentSelection()}
        onChange={handleSelection}
        showLabels
        sx={{
          height: 68,
          bgcolor: '#ffffff',
          '& .MuiBottomNavigationAction-root': {
            color: '#8a94a6',
            minWidth: 0,
            paddingTop: '6px',
          },
          '& .MuiBottomNavigationAction-root.Mui-selected': {
            color: '#1e293b',
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '10.5px',
            fontWeight: 600,
            marginTop: '4px',
          },
          '& .MuiBottomNavigationAction-label.Mui-selected': {
            fontWeight: 700,
          },
        }}
      >
        <BottomNavigationAction
          label={t("mapTitle")}
          icon={
            <Badge color="error" variant="dot" overlap="circular" invisible={socket !== false}>
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: currentSelection() === 'map' ? 'linear-gradient(135deg, #42a5f5, #1565c0)' : 'transparent',
                  boxShadow: currentSelection() === 'map' ? '0 4px 10px rgba(21,101,192,0.4)' : 'none',
                  transition: 'all 0.25s ease',
                }}
              >
                <MapIcon sx={{ fontSize: 20, color: currentSelection() === 'map' ? '#fff' : '#8a94a6' }} />
              </Box>
            </Badge>
          }
          value="map"
        />
        {!disableReports && (
          <BottomNavigationAction
            label={t("reportTitle")}
            icon={
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: currentSelection() === 'reports' ? 'linear-gradient(135deg, #ab47bc, #6a1b9a)' : 'transparent',
                  boxShadow: currentSelection() === 'reports' ? '0 4px 10px rgba(106,27,154,0.4)' : 'none',
                  transition: 'all 0.25s ease',
                }}
              >
                <DescriptionIcon sx={{ fontSize: 20, color: currentSelection() === 'reports' ? '#fff' : '#8a94a6' }} />
              </Box>
            }
            value="reports"
          />
        )}
        {!readonly && (
          <BottomNavigationAction
            label={t("settingsTitle")}
            icon={
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: currentSelection() === 'settings' ? 'linear-gradient(135deg, #ffa726, #ef6c00)' : 'transparent',
                  boxShadow: currentSelection() === 'settings' ? '0 4px 10px rgba(239,108,0,0.4)' : 'none',
                  transition: 'all 0.25s ease',
                }}
              >
                <SettingsIcon sx={{ fontSize: 20, color: currentSelection() === 'settings' ? '#fff' : '#8a94a6' }} />
              </Box>
            }
            value="settings"
          />
        )}
        {readonly ? (
          <BottomNavigationAction
            label={t("loginLogout")}
            icon={
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent',
                }}
              >
                <ExitToAppIcon sx={{ fontSize: 20, color: '#8a94a6' }} />
              </Box>
            }
            value="logout"
          />
        ) : (
          <BottomNavigationAction
            label={t("settingsUser")}
            icon={
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: currentSelection() === 'account' ? 'linear-gradient(135deg, #66bb6a, #2e7d32)' : 'transparent',
                  boxShadow: currentSelection() === 'account' ? '0 4px 10px rgba(46,125,50,0.4)' : 'none',
                  transition: 'all 0.25s ease',
                }}
              >
                <PersonIcon sx={{ fontSize: 20, color: currentSelection() === 'account' ? '#fff' : '#8a94a6' }} />
              </Box>
            }
            value="account"
          />
        )}
      </BottomNavigation>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={handleAccount}>
          <Typography color="textPrimary">{t('settingsUser')}</Typography>
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <Typography color="error">{t('loginLogout')}</Typography>
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default BottomMenu;



