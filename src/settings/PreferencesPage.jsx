import { useState } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  InputAdornment,
  IconButton,
  OutlinedInput,
  Autocomplete,
  TextField,
  createFilterOptions,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CachedIcon from '@mui/icons-material/Cached';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MapIcon from '@mui/icons-material/Map';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import TokenIcon from '@mui/icons-material/Token';
import InfoIcon from '@mui/icons-material/Info';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useTranslation, useTranslationKeys } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import { prefixString, unprefixString } from '../common/util/stringUtils';
import SelectField from '../common/components/SelectField';
import useMapStyles from '../map/core/useMapStyles';
import useMapOverlays from '../map/overlay/useMapOverlays';
import { useCatch } from '../reactHelper';
import { sessionActions } from '../store';
import { useAdministrator, useRestriction } from '../common/util/permissions';
import fetchOrThrow from '../common/util/fetchOrThrow';

const deviceFields = [
  { id: 'name', name: 'sharedName' },
  { id: 'uniqueId', name: 'deviceIdentifier' },
  { id: 'phone', name: 'sharedPhone' },
  { id: 'model', name: 'deviceModel' },
  { id: 'contact', name: 'deviceContact' },
  { id: 'geofenceIds', name: 'sharedGeofence' },
  { id: 'driverUniqueId', name: 'sharedDriver' },
  { id: 'motion', name: 'positionMotion' },
];

const PreferencesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();

  const admin = useAdministrator();
  const readonly = useRestriction('readonly');

  const user = useSelector((state) => state.session.user);
  const [attributes, setAttributes] = useState(user.attributes);

  const versionApp = import.meta.env.VITE_APP_VERSION;
  const versionServer = useSelector((state) => state.session.server.version);
  const socket = useSelector((state) => state.session.socket);

  const [token, setToken] = useState(null);
  const [tokenExpiration, setTokenExpiration] = useState(() =>
    dayjs().add(1, 'week').locale('en').format('YYYY-MM-DD'),
  );

  const [expandedPanel, setExpandedPanel] = useState('map');

  const handleChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const mapStyles = useMapStyles();
  const mapOverlays = useMapOverlays();
  const positionAttributes = usePositionAttributes(t);
  const filter = createFilterOptions();

  const generateToken = useCatch(async () => {
    const expiration = dayjs(tokenExpiration, 'YYYY-MM-DD').toISOString();
    const response = await fetchOrThrow('/api/session/token', {
      method: 'POST',
      body: new URLSearchParams(`expiration=${expiration}`),
    });
    setToken(await response.text());
  });

  const alarms = useTranslationKeys((it) => it.startsWith('alarm')).map((it) => ({
    key: unprefixString('alarm', it),
    name: t(it),
  }));

  const handleSave = useCatch(async () => {
    const response = await fetchOrThrow(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, attributes }),
    });
    dispatch(sessionActions.updateUser(await response.json()));
    navigate(-1);
  });

  const handleReboot = useCatch(async () => {
    const response = await fetch('/api/server/reboot', { method: 'POST' });
    throw Error(response.statusText);
  });

  const renderHeader = (icon, title, isExpanded) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          backgroundColor: isExpanded ? '#ede9fe' : '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
      >
        {icon}
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.98rem' }}>
        {title}
      </Typography>
    </Box>
  );

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'sharedPreferences']}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 480,
          mx: 'auto',
          p: { xs: 1, sm: 2 },
          '& .MuiOutlinedInput-root': {
            borderRadius: '14px',
            backgroundColor: '#f9fafb',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: '#ffffff',
            },
            '&.Mui-focused': {
              backgroundColor: '#ffffff',
              boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.15)',
            },
          },
        }}
      >
        {!readonly && (
          <>
            {/* MAPA */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: '20px',
                mb: 2,
                border: '1px solid #edf2f7',
                boxShadow: '0 8px 24px rgba(149, 157, 165, 0.08)',
                overflow: 'hidden',
              }}
            >
              <Accordion
                expanded={expandedPanel === 'map'}
                onChange={handleChange('map')}
                sx={{ boxShadow: 'none', backgroundColor: 'transparent', '&:before': { display: 'none' } }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: '#7c3aed' }} />}
                  sx={{
                    px: 2.5,
                    py: 1,
                    backgroundColor: expandedPanel === 'map' ? '#f5f3ff' : '#ffffff',
                    transition: 'background-color 0.2s',
                  }}
                >
                  {renderHeader(<MapIcon sx={{ fontSize: 20, color: '#7c3aed' }} />, t('mapTitle'), expandedPanel === 'map')}
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>{t('mapActive')}</InputLabel>
                    <Select
                      label={t('mapActive')}
                      value={
                        attributes.activeMapStyles?.split(',') || [
                          'locationIqStreets',
                          'locationIqDark',
                          'openFreeMap',
                        ]
                      }
                      onChange={(e, child) => {
                        const clicked = mapStyles.find((s) => s.id === child.props.value);
                        if (clicked.available) {
                          setAttributes({ ...attributes, activeMapStyles: e.target.value.join(',') });
                        } else if (clicked.id !== 'custom') {
                          const query = new URLSearchParams({ attribute: clicked.attribute });
                          navigate(`/settings/user/${user.id}?${query.toString()}`);
                        }
                      }}
                      multiple
                    >
                      {mapStyles.map((style) => (
                        <MenuItem key={style.id} value={style.id}>
                          <Typography
                            component="span"
                            color={style.available ? 'textPrimary' : 'error'}
                          >
                            {style.title}
                          </Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>{t('mapOverlay')}</InputLabel>
                    <Select
                      label={t('mapOverlay')}
                      value={attributes.selectedMapOverlay?.split(',') || []}
                      onChange={(e, child) => {
                        const clicked = mapOverlays.find((o) => o.id === child.props.value);
                        if (clicked.available) {
                          setAttributes({
                            ...attributes,
                            selectedMapOverlay: e.target.value.join(','),
                          });
                        } else if (clicked.id !== 'custom') {
                          const query = new URLSearchParams({ attribute: clicked.attribute });
                          navigate(`/settings/user/${user.id}?${query.toString()}`);
                        }
                      }}
                      multiple
                    >
                      {mapOverlays.map((overlay) => (
                        <MenuItem key={overlay.id} value={overlay.id}>
                          <Typography
                            component="span"
                            color={overlay.available ? 'textPrimary' : 'error'}
                          >
                            {overlay.title}
                          </Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Autocomplete
                    multiple
                    freeSolo
                    options={Object.keys(positionAttributes)}
                    getOptionLabel={(option) => {
                      if (typeof option === 'object' && option.inputValue) {
                        return option.inputValue;
                      }
                      return positionAttributes[option]?.name || option;
                    }}
                    value={
                      attributes.positionItems?.split(',') || [
                        'fixTime',
                        'address',
                        'speed',
                        'totalDistance',
                      ]
                    }
                    onChange={(_, newValue) => {
                      setAttributes({
                        ...attributes,
                        positionItems: newValue
                          .map((x) => (typeof x === 'string' ? x : x.inputValue))
                          .join(','),
                      });
                    }}
                    filterOptions={(options, params) => {
                      const filtered = filter(options, params);
                      if (params.inputValue && !options.includes(params.inputValue)) {
                        filtered.push({
                          inputValue: params.inputValue,
                          name: `${t('sharedAdd')} "${params.inputValue}"`,
                        });
                      }
                      return filtered;
                    }}
                    renderOption={(props, option) => (
                      <li {...props}>
                        {option.name ? option.name : positionAttributes[option]?.name || option}
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField {...params} label={t('attributePopupInfo')} fullWidth />
                    )}
                  />

                  <FormControl fullWidth>
                    <InputLabel>{t('mapLiveRoutes')}</InputLabel>
                    <Select
                      label={t('mapLiveRoutes')}
                      value={attributes.mapLiveRoutes || 'none'}
                      onChange={(e) =>
                        setAttributes({ ...attributes, mapLiveRoutes: e.target.value })
                      }
                    >
                      <MenuItem value="none">{t('sharedDisabled')}</MenuItem>
                      <MenuItem value="selected">{t('deviceSelected')}</MenuItem>
                      <MenuItem value="all">{t('notificationAlways')}</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>{t('mapDirection')}</InputLabel>
                    <Select
                      label={t('mapDirection')}
                      value={attributes.mapDirection || 'selected'}
                      onChange={(e) => setAttributes({ ...attributes, mapDirection: e.target.value })}
                    >
                      <MenuItem value="none">{t('sharedDisabled')}</MenuItem>
                      <MenuItem value="selected">{t('deviceSelected')}</MenuItem>
                      <MenuItem value="all">{t('notificationAlways')}</MenuItem>
                    </Select>
                  </FormControl>

                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={
                            attributes.hasOwnProperty('mapFollow') ? attributes.mapFollow : false
                          }
                          onChange={(e) =>
                            setAttributes({ ...attributes, mapFollow: e.target.checked })
                          }
                          sx={{ color: '#7c3aed', '&.Mui-checked': { color: '#6d28d9' } }}
                        />
                      }
                      label={<Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>{t('deviceFollow')}</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={
                            attributes.hasOwnProperty('mapCluster') ? attributes.mapCluster : true
                          }
                          onChange={(e) =>
                            setAttributes({ ...attributes, mapCluster: e.target.checked })
                          }
                          sx={{ color: '#7c3aed', '&.Mui-checked': { color: '#6d28d9' } }}
                        />
                      }
                      label={<Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>{t('mapClustering')}</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={
                            attributes.hasOwnProperty('mapOnSelect') ? attributes.mapOnSelect : true
                          }
                          onChange={(e) =>
                            setAttributes({ ...attributes, mapOnSelect: e.target.checked })
                          }
                          sx={{ color: '#7c3aed', '&.Mui-checked': { color: '#6d28d9' } }}
                        />
                      }
                      label={<Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>{t('mapOnSelect')}</Typography>}
                    />
                  </FormGroup>
                </AccordionDetails>
              </Accordion>
            </Paper>

            {/* DISPOSITIVOS */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: '20px',
                mb: 2,
                border: '1px solid #edf2f7',
                boxShadow: '0 8px 24px rgba(149, 157, 165, 0.08)',
                overflow: 'hidden',
              }}
            >
              <Accordion
                expanded={expandedPanel === 'devices'}
                onChange={handleChange('devices')}
                sx={{ boxShadow: 'none', backgroundColor: 'transparent', '&:before': { display: 'none' } }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: '#7c3aed' }} />}
                  sx={{
                    px: 2.5,
                    py: 1,
                    backgroundColor: expandedPanel === 'devices' ? '#f5f3ff' : '#ffffff',
                    transition: 'background-color 0.2s',
                  }}
                >
                  {renderHeader(<SmartphoneIcon sx={{ fontSize: 20, color: '#7c3aed' }} />, t('deviceTitle'), expandedPanel === 'devices')}
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <SelectField
                    value={attributes.devicePrimary || 'name'}
                    onChange={(e) => setAttributes({ ...attributes, devicePrimary: e.target.value })}
                    data={deviceFields}
                    titleGetter={(it) => t(it.name)}
                    label={t('devicePrimaryInfo')}
                    fullWidth
                  />
                  <SelectField
                    value={attributes.deviceSecondary}
                    onChange={(e) =>
                      setAttributes({ ...attributes, deviceSecondary: e.target.value })
                    }
                    data={deviceFields}
                    titleGetter={(it) => t(it.name)}
                    label={t('deviceSecondaryInfo')}
                    fullWidth
                  />
                </AccordionDetails>
              </Accordion>
            </Paper>

            {/* NOTIFICAÇÃO SONORA */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: '20px',
                mb: 2,
                border: '1px solid #edf2f7',
                boxShadow: '0 8px 24px rgba(149, 157, 165, 0.08)',
                overflow: 'hidden',
              }}
            >
              <Accordion
                expanded={expandedPanel === 'sound'}
                onChange={handleChange('sound')}
                sx={{ boxShadow: 'none', backgroundColor: 'transparent', '&:before': { display: 'none' } }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: '#7c3aed' }} />}
                  sx={{
                    px: 2.5,
                    py: 1,
                    backgroundColor: expandedPanel === 'sound' ? '#f5f3ff' : '#ffffff',
                    transition: 'background-color 0.2s',
                  }}
                >
                  {renderHeader(<VolumeUpIcon sx={{ fontSize: 20, color: '#7c3aed' }} />, t('sharedSound'), expandedPanel === 'sound')}
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <SelectField
                    multiple
                    value={attributes.soundEvents?.split(',') || []}
                    onChange={(e) =>
                      setAttributes({ ...attributes, soundEvents: e.target.value.join(',') })
                    }
                    endpoint="/api/notifications/types"
                    keyGetter={(it) => it.type}
                    titleGetter={(it) => t(prefixString('event', it.type))}
                    label={t('eventsSoundEvents')}
                    fullWidth
                  />
                  <SelectField
                    multiple
                    value={attributes.soundAlarms?.split(',') || ['sos']}
                    onChange={(e) =>
                      setAttributes({ ...attributes, soundAlarms: e.target.value.join(',') })
                    }
                    data={alarms}
                    keyGetter={(it) => it.key}
                    label={t('eventsSoundAlarms')}
                    fullWidth
                  />
                </AccordionDetails>
              </Accordion>
            </Paper>
          </>
        )}

        {/* TOKEN */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '20px',
            mb: 2,
            border: '1px solid #edf2f7',
            boxShadow: '0 8px 24px rgba(149, 157, 165, 0.08)',
            overflow: 'hidden',
          }}
        >
          <Accordion
            expanded={expandedPanel === 'token'}
            onChange={handleChange('token')}
            sx={{ boxShadow: 'none', backgroundColor: 'transparent', '&:before': { display: 'none' } }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#7c3aed' }} />}
              sx={{
                px: 2.5,
                py: 1,
                backgroundColor: expandedPanel === 'token' ? '#f5f3ff' : '#ffffff',
                transition: 'background-color 0.2s',
              }}
            >
              {renderHeader(<TokenIcon sx={{ fontSize: 20, color: '#7c3aed' }} />, t('userToken'), expandedPanel === 'token')}
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={t('userExpirationTime')}
                type="date"
                value={tokenExpiration}
                onChange={(e) => {
                  setTokenExpiration(e.target.value);
                  setToken(null);
                }}
                fullWidth
              />
              <FormControl fullWidth>
                <OutlinedInput
                  multiline
                  rows={4}
                  readOnly
                  type="text"
                  value={token || ''}
                  endAdornment={
                    <InputAdornment position="end">
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={generateToken}
                          disabled={Boolean(token)}
                          sx={{ color: '#7c3aed' }}
                        >
                          <CachedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={() => navigator.clipboard.writeText(token)}
                          disabled={!token}
                          sx={{ color: '#7c3aed' }}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </InputAdornment>
                  }
                />
              </FormControl>
            </AccordionDetails>
          </Accordion>
        </Paper>

        {!readonly && (
          <>
            {/* INFORMAÇÕES DO SISTEMA */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: '20px',
                mb: 3,
                border: '1px solid #edf2f7',
                boxShadow: '0 8px 24px rgba(149, 157, 165, 0.08)',
                overflow: 'hidden',
              }}
            >
              <Accordion
                expanded={expandedPanel === 'info'}
                onChange={handleChange('info')}
                sx={{ boxShadow: 'none', backgroundColor: 'transparent', '&:before': { display: 'none' } }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: '#7c3aed' }} />}
                  sx={{
                    px: 2.5,
                    py: 1,
                    backgroundColor: expandedPanel === 'info' ? '#f5f3ff' : '#ffffff',
                    transition: 'background-color 0.2s',
                  }}
                >
                  {renderHeader(<InfoIcon sx={{ fontSize: 20, color: '#7c3aed' }} />, t('sharedInfoTitle'), expandedPanel === 'info')}
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField value={versionApp} label={t('settingsAppVersion')} disabled fullWidth />
                  <TextField
                    value={versionServer || '-'}
                    label={t('settingsServerVersion')}
                    disabled
                    fullWidth
                  />
                  <TextField
                    value={socket ? t('deviceStatusOnline') : t('deviceStatusOffline')}
                    label={t('settingsConnection')}
                    disabled
                    fullWidth
                  />
                  <Button
                    variant="outlined"
                    startIcon={<SportsEsportsIcon />}
                    onClick={() => navigate('/emulator')}
                    sx={{
                      borderRadius: '12px',
                      textTransform: 'none',
                      fontWeight: 700,
                      borderColor: '#7c3aed',
                      color: '#7c3aed',
                      '&:hover': {
                        borderColor: '#6d28d9',
                        backgroundColor: '#f5f3ff',
                      },
                    }}
                  >
                    {t('sharedEmulator')}
                  </Button>
                  {admin && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<RestartAltIcon />}
                      onClick={handleReboot}
                      sx={{
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 700,
                      }}
                    >
                      {t('serverReboot')}
                    </Button>
                  )}
                </AccordionDetails>
              </Accordion>
            </Paper>

            {/* BOTÕES SALVAR / CANCELAR */}
            <Box sx={{ display: 'flex', gap: 1.5, pb: 4 }}>
              <Button
                type="button"
                variant="outlined"
                onClick={() => navigate(-1)}
                sx={{
                  flex: 1,
                  py: 1.2,
                  borderRadius: '14px',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderColor: '#cbd5e1',
                  color: '#475569',
                  '&:hover': {
                    borderColor: '#94a3b8',
                    backgroundColor: '#f1f5f9',
                  },
                }}
              >
                {t('sharedCancel')}
              </Button>
              <Button
                type="button"
                variant="contained"
                onClick={handleSave}
                sx={{
                  flex: 1,
                  py: 1.2,
                  borderRadius: '14px',
                  fontWeight: 800,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)',
                  },
                }}
              >
                {t('sharedSave')}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </PageLayout>
  );
};

export default PreferencesPage;