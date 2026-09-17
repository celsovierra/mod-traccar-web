import { useEffect, useRef, useState } from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  Button,
  TextField,
  Link,
  Snackbar,
  IconButton,
  Tooltip,
  Typography,
  InputAdornment,
  Box,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import CountryFlag from 'react-country-flag';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import VpnLockIcon from '@mui/icons-material/VpnLock';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import NavigationIcon from '@mui/icons-material/Navigation';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PinOutlinedIcon from '@mui/icons-material/PinOutlined';
import { useTheme } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { sessionActions } from '../store';
import { useLocalization, useTranslation } from '../common/components/LocalizationProvider';
import LoginLayout from './LoginLayout';
import usePersistedState from '../common/util/usePersistedState';
import {
  generateLoginToken,
  handleLoginTokenListeners,
  nativeEnvironment,
  nativePostMessage,
} from '../common/components/NativeInterface';
import { useCatch } from '../reactHelper';
import QrCodeDialog from '../common/components/QrCodeDialog';
import PasswordField from '../common/components/PasswordField';

const useStyles = makeStyles()((theme) => ({
  options: {
    position: 'fixed',
    top: 'max(env(safe-area-inset-top), 16px)',
    right: theme.spacing(2),
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(1),
    zIndex: 10,
  },
  optionIcon: {
    color: '#ffffff !important',
    backgroundColor: 'rgba(255,255,255,0.12)',
    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
  },
  iconBox: {
    width: '64px',
    height: '64px',
    borderRadius: '20px',
    backgroundColor: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    marginBottom: theme.spacing(1.5),
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    width: '100%',
  },
  extraContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    marginTop: theme.spacing(0.5),
  },
  submitButton: {
    padding: theme.spacing(1.5),
    borderRadius: '14px',
    fontWeight: 700,
    textTransform: 'none',
    fontSize: '1rem',
    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    boxShadow: '0 6px 16px rgba(22, 163, 74, 0.35)',
    '&:hover': {
      background: 'linear-gradient(135deg, #15803d 0%, #14532d 100%)',
      boxShadow: '0 8px 20px rgba(22, 163, 74, 0.45)',
    },
  },
  link: {
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  flag: {
    marginRight: theme.spacing(1),
  },
  inputField: {
    '& .MuiOutlinedInput-root': {
      borderRadius: '14px',
      backgroundColor: '#f8fafc',
      fontSize: '1rem',
    },
    '& input': {
      fontSize: '16px',
    },
  },
}));

const LoginPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = useTranslation();

  const { languages, language, setLocalLanguage } = useLocalization();
  const languageList = Object.entries(languages).map((values) => ({
    code: values[0],
    country: values[1].country,
    name: values[1].name,
  }));

  const [failed, setFailed] = useState(false);

  const [email, setEmail] = usePersistedState('loginEmail', '');
  const [rememberPassword, setRememberPassword] = usePersistedState('loginRememberPassword', false);
  const [savedPassword, setSavedPassword] = usePersistedState('loginSavedPassword', '');
  const [password, setPassword] = useState(() => (rememberPassword ? savedPassword : ''));
  const [code, setCode] = useState('');
  const [showServerTooltip, setShowServerTooltip] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const registrationEnabled = useSelector((state) => state.session.server.registration);
  const languageEnabled = useSelector((state) => {
    const attributes = state.session.server.attributes;
    return !attributes.language && !attributes['ui.disableLoginLanguage'];
  });
  const changeEnabled = useSelector((state) => !state.session.server.attributes.disableChange);
  const emailEnabled = useSelector((state) => state.session.server.emailEnabled);
  const openIdEnabled = useSelector((state) => state.session.server.openIdEnabled);
  const openIdForced = useSelector(
    (state) => state.session.server.openIdEnabled && state.session.server.openIdForce,
  );
  const [codeEnabled, setCodeEnabled] = useState(false);

  const [announcementShown, setAnnouncementShown] = useState(false);
  const announcement = useSelector((state) => state.session.server.announcement);

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setFailed(false);
    try {
      const query = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
      const response = await fetch('/api/session', {
        method: 'POST',
        body: new URLSearchParams(code.length ? `${query}&code=${code}` : query),
      });
      if (response.ok) {
        const user = await response.json();
        generateLoginToken();
        dispatch(sessionActions.updateUser(user));
        setSavedPassword(rememberPassword ? password : '');
        const target = window.sessionStorage.getItem('postLogin') || '/';
        window.sessionStorage.removeItem('postLogin');
        navigate(target, { replace: true });
      } else if (response.status === 401 && response.headers.get('WWW-Authenticate') === 'TOTP') {
        setCodeEnabled(true);
      } else {
        throw Error(await response.text());
      }
    } catch {
      setFailed(true);
      setPassword('');
    }
  };

  const handleTokenLogin = useCatch(async (token) => {
    const response = await fetch(`/api/session?token=${encodeURIComponent(token)}`);
    if (response.ok) {
      const user = await response.json();
      dispatch(sessionActions.updateUser(user));
      navigate('/');
    } else if (response.status === 401) {
      nativePostMessage('logout');
    }
  });

  const handleTokenLoginRef = useRef(handleTokenLogin);
  handleTokenLoginRef.current = handleTokenLogin;

  const handleOpenIdLogin = () => {
    document.location = '/api/session/openid/auth';
  };

  useEffect(() => nativePostMessage('authentication'), []);

  useEffect(() => {
    const listener = (token) => handleTokenLoginRef.current(token);
    handleLoginTokenListeners.add(listener);
    return () => handleLoginTokenListeners.delete(listener);
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem('hostname') !== window.location.hostname) {
      window.localStorage.setItem('hostname', window.location.hostname);
      setShowServerTooltip(true);
    }
  }, []);

  const header = (
    <>
      <div className={classes.iconBox}>
        <NavigationIcon fontSize="large" />
      </div>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
        GPScell
      </Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, mt: 0.5 }}>
        Sistema de Rastreamento Veicular
      </Typography>
    </>
  );

  return (
    <LoginLayout header={header}>
      <div className={classes.options}>
        {nativeEnvironment && changeEnabled && (
          <IconButton className={classes.optionIcon} onClick={() => navigate('/change-server')}>
            <Tooltip
              title={`${t('settingsServer')}: ${window.location.hostname}`}
              open={showServerTooltip}
              arrow
            >
              <VpnLockIcon fontSize="small" />
            </Tooltip>
          </IconButton>
        )}
        {!nativeEnvironment && (
          <IconButton className={classes.optionIcon} onClick={() => setShowQr(true)}>
            <QrCode2Icon fontSize="small" />
          </IconButton>
        )}
        {languageEnabled && (
          <FormControl size="small">
            <Select
              value={language}
              onChange={(e) => setLocalLanguage(e.target.value)}
              sx={{
                color: '#ffffff',
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderRadius: '10px',
                '& .MuiSelect-icon': { color: '#ffffff' },
                '& fieldset': { border: 'none' },
              }}
            >
              {languageList.map((it) => (
                <MenuItem key={it.code} value={it.code}>
                  <span className={classes.flag}>
                    <CountryFlag countryCode={it.country} svg />
                  </span>
                  {it.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </div>

      <Box sx={{ width: '100%' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
          Bem-vindo de volta
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
          Entre com sua conta para continuar
        </Typography>

        <div className={classes.container}>
          {!openIdForced && (
            <>
              <TextField
                required
                error={failed}
                label={t('userEmail')}
                name="email"
                value={email}
                autoComplete="email"
                autoFocus={!email}
                onChange={(e) => setEmail(e.target.value)}
                helperText={failed && 'Usuario ou senha invalidos'}
                className={classes.inputField}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailOutlineIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <PasswordField
                required
                error={failed}
                label={t('userPassword')}
                name="password"
                value={password}
                autoComplete="current-password"
                autoFocus={!!email}
                onChange={(e) => setPassword(e.target.value)}
                className={classes.inputField}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberPassword}
                    onChange={(e) => setRememberPassword(e.target.checked)}
                    sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#16a34a' } }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 500 }}>
                    Lembrar minha senha
                  </Typography>
                }
                sx={{ mt: -1, ml: 0 }}
              />
              {codeEnabled && (
                <TextField
                  required
                  error={failed}
                  label={t('loginTotpCode')}
                  name="code"
                  value={code}
                  type="number"
                  onChange={(e) => setCode(e.target.value)}
                  className={classes.inputField}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PinOutlinedIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
              <Button
                onClick={handlePasswordLogin}
                type="submit"
                variant="contained"
                disabled={!email || !password || (codeEnabled && !code)}
                className={classes.submitButton}
              >
                {t('loginLogin')}
              </Button>
            </>
          )}
          {openIdEnabled && (
            <Button
              onClick={() => handleOpenIdLogin()}
              variant="contained"
              className={classes.submitButton}
            >
              {t('loginOpenId')}
            </Button>
          )}
          {!openIdForced && (
            <div className={classes.extraContainer}>
              {registrationEnabled && (
                <Link
                  onClick={() => navigate('/register')}
                  className={classes.link}
                  underline="hover"
                  variant="body2"
                >
                  {t('loginRegister')}
                </Link>
              )}
              {emailEnabled && (
                <Link
                  onClick={() => navigate('/reset-password')}
                  className={classes.link}
                  underline="hover"
                  variant="body2"
                >
                  {t('loginReset')}
                </Link>
              )}
            </div>
          )}
        </div>
      </Box>

      <QrCodeDialog open={showQr} onClose={() => setShowQr(false)} />
      <Snackbar
        open={!!announcement && !announcementShown}
        message={announcement}
        action={
          <IconButton size="small" color="inherit" onClick={() => setAnnouncementShown(true)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </LoginLayout>
  );
};

export default LoginPage;

