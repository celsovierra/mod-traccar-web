import { useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Toolbar,
  IconButton,
  OutlinedInput,
  Tooltip,
  Chip,
  Box,
  InputAdornment,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import MapIcon from '@mui/icons-material/Map';
import DnsIcon from '@mui/icons-material/Dns';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import NavigationIcon from '@mui/icons-material/Navigation';
import HistoryIcon from '@mui/icons-material/History';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useDeviceReadonly } from '../common/util/permissions';

const useStyles = makeStyles()((theme) => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    paddingBottom: theme.spacing(0.5),
  },
  toolbar: {
    display: 'flex',
    gap: theme.spacing(1),
    minHeight: 48,
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.5, 1),
    width: '100%',
    boxSizing: 'border-box',
  },
  chip: {
    fontWeight: 700,
    fontSize: '0.72rem',
    height: 26,
    flex: 1,
    padding: 0,
    '& .MuiChip-icon': {
      marginLeft: '4px',
      marginRight: '-4px',
    },
    '& .MuiChip-label': {
      paddingLeft: '6px',
      paddingRight: '6px',
    },
  },
  iconAll: {
    color: '#1976d2 !important',
  },
  iconOnline: {
    color: '#2e7d32 !important',
  },
  iconOffline: {
    color: '#d32f2f !important',
  },
  iconMoving: {
    color: '#0288d1 !important',
  },
  iconHistory: {
    color: '#ed6c02 !important',
  },
}));

const MainToolbar = ({
  devicesOpen,
  setDevicesOpen,
  keyword,
  setKeyword,
  filter = { statuses: [], groups: [], geofences: [] },
  setFilter,
  filterSort,
  setFilterSort,
}) => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const t = useTranslation();

  const deviceReadonly = useDeviceReadonly();

  const devices = useSelector((state) => state.devices?.items || {});
  const positions = useSelector((state) => state.session?.positions || state.positions?.items || {});
  const devicesLoaded = useSelector((state) => state.devices?.loaded);

  const toolbarRef = useRef();

  const twoDaysAgo = dayjs().subtract(2, 'day').valueOf();
  const deviceList = Object.values(devices);
  const totalCount = deviceList.length;
  const onlineCount = deviceList.filter((d) => d.status === 'online').length;
  const offlineCount = deviceList.filter((d) => d.status === 'offline' || d.status === 'unknown').length;

  const movingCount = deviceList.filter((d) => {
    const pos = positions[d.id];
    return (
      d.status === 'online' &&
      pos &&
      pos.speed > 0 &&
      pos.attributes?.ignition === true
    );
  }).length;

  const oldOfflineCount = deviceList.filter((d) => {
    const isOffline = d.status === 'offline' || d.status === 'unknown';
    const lastTime = d.lastUpdate ? dayjs(d.lastUpdate).valueOf() : 0;
    return isOffline && (!d.lastUpdate || lastTime <= twoDaysAgo);
  }).length;

  let activeTab = 'all';
  if (filterSort === 'lastUpdateAsc') {
    activeTab = 'time';
  } else if (filter?.statuses?.includes('moving')) {
    activeTab = 'moving';
  } else if (filter?.statuses?.includes('offline') || filter?.statuses?.includes('unknown')) {
    activeTab = 'offline';
  } else if (filter?.statuses?.length === 1 && filter?.statuses?.includes('online')) {
    activeTab = 'online';
  }

  const handleSelectFilter = (type) => {
    if (type !== 'time') {
      setFilterSort('');
    }

    if (type === 'all') {
      setFilter({ ...filter, statuses: [] });
    } else if (type === 'online') {
      setFilter({ ...filter, statuses: ['online'] });
    } else if (type === 'offline') {
      setFilter({ ...filter, statuses: ['offline', 'unknown'] });
    } else if (type === 'moving') {
      setFilter({ ...filter, statuses: ['moving'] });
    } else if (type === 'time') {
      setFilter({ ...filter, statuses: [] });
      setFilterSort('lastUpdateAsc');
    }
  };

  return (
    <Box className={classes.container} sx={!devicesOpen ? { width: 'auto', p: 0 } : {}}>
      <Toolbar
        ref={toolbarRef}
        className={classes.toolbar}
        disableGutters
        sx={!devicesOpen ? { minHeight: 'unset', p: 0.5 } : {}}
      >
        <IconButton
          edge="start"
          onClick={() => setDevicesOpen(!devicesOpen)}
          sx={!devicesOpen ? { bgcolor: 'background.paper', boxShadow: 2, m: 0.5 } : {}}
        >
          {devicesOpen ? <MapIcon /> : <DnsIcon />}
        </IconButton>

        {devicesOpen && (
          <>
            <OutlinedInput
              placeholder={t('sharedSearchDevices')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              size="small"
              fullWidth
              endAdornment={
                keyword ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      edge="end"
                      onClick={() => setKeyword('')}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }
            />

            <IconButton edge="end" onClick={() => navigate('/device')} disabled={deviceReadonly}>
              <Tooltip
                open={!deviceReadonly && devicesLoaded && totalCount === 0}
                title={t('deviceRegisterFirst')}
                arrow
              >
                <AddIcon />
              </Tooltip>
            </IconButton>
          </>
        )}
      </Toolbar>

      {devicesOpen && (
        <Box className={classes.filterBar}>
          <Tooltip title="Todos os veículos">
            <Chip
              icon={<AllInclusiveIcon fontSize="small" className={classes.iconAll} />}
              label={totalCount}
              size="small"
              color={activeTab === 'all' ? 'primary' : 'default'}
              variant={activeTab === 'all' ? 'filled' : 'outlined'}
              onClick={() => handleSelectFilter('all')}
              className={classes.chip}
              clickable
            />
          </Tooltip>

          <Tooltip title="Online">
            <Chip
              icon={<CheckCircleIcon fontSize="small" className={classes.iconOnline} />}
              label={onlineCount}
              size="small"
              color={activeTab === 'online' ? 'success' : 'default'}
              variant={activeTab === 'online' ? 'filled' : 'outlined'}
              onClick={() => handleSelectFilter('online')}
              className={classes.chip}
              clickable
            />
          </Tooltip>

          <Tooltip title="Offline">
            <Chip
              icon={<CancelIcon fontSize="small" className={classes.iconOffline} />}
              label={offlineCount}
              size="small"
              color={activeTab === 'offline' ? 'error' : 'default'}
              variant={activeTab === 'offline' ? 'filled' : 'outlined'}
              onClick={() => handleSelectFilter('offline')}
              className={classes.chip}
              clickable
            />
          </Tooltip>

          <Tooltip title="Em movimento (Ignição ON e Vel > 0)">
            <Chip
              icon={<NavigationIcon fontSize="small" className={classes.iconMoving} />}
              label={movingCount}
              size="small"
              color={activeTab === 'moving' ? 'info' : 'default'}
              variant={activeTab === 'moving' ? 'filled' : 'outlined'}
              onClick={() => handleSelectFilter('moving')}
              className={classes.chip}
              clickable
            />
          </Tooltip>

          <Tooltip title="Offline há mais de 2 dias (do mais antigo para o mais recente)">
            <Chip
              icon={<HistoryIcon fontSize="small" className={classes.iconHistory} />}
              label={oldOfflineCount}
              size="small"
              color={activeTab === 'time' ? 'warning' : 'default'}
              variant={activeTab === 'time' ? 'filled' : 'outlined'}
              onClick={() => handleSelectFilter('time')}
              className={classes.chip}
              clickable
            />
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export default MainToolbar;