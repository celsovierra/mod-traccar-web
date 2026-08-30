import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Collapse,
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
  Avatar,
  ButtonBase,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import RouteIcon from '@mui/icons-material/Route';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlaceIcon from '@mui/icons-material/Place';
import SpeedIcon from '@mui/icons-material/Speed';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import LockPersonIcon from '@mui/icons-material/LockPerson';

import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import fetchOrThrow from '../util/fetchOrThrow';
import { mapIconKey, mapIcons } from '../../map/core/preloadImages';
import { formatStatus } from '../util/formatter';

const useStyles = makeStyles()((theme, { desktopPadding }) => ({
  root: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 5,
    left: '50%',
    [theme.breakpoints.up('md')]: {
      left: `calc(50% + ${desktopPadding} / 2)`,
      bottom: theme.spacing(3),
    },
    [theme.breakpoints.down('md')]: {
      left: '50%',
      bottom: `calc(${theme.spacing(3)} + ${theme.dimensions.bottomBarHeight}px)`,
    },
    transform: 'translateX(-50%)',
  },
  card: {
    pointerEvents: 'auto',
    width: 420,
    maxWidth: '94vw',
    borderRadius: 24,
    backgroundColor: '#ffffff',
    boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
    overflow: 'visible',
    position: 'relative',
    padding: '8px 16px 14px 16px',
  },
  toggleTab: {
    position: 'absolute',
    top: -14,
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#ffffff',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
    borderRadius: '16px 16px 0 0',
    padding: '2px 18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(0,0,0,0.06)',
    borderBottom: 'none',
  },
  headerBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 0 8px 0',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    backgroundColor: '#ede9fe',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIcon: {
    width: 26,
    height: 26,
    filter: 'invert(27%) sepia(85%) saturate(2250%) hue-rotate(242deg) brightness(92%) contrast(98%)',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '2px',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
  },
  mainBody: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    padding: '4px 0',
  },
  contentLeft: {
    flex: 1.2,
    padding: 0,
    '&:last-child': {
      paddingBottom: 0,
    },
  },
  table: {
    '& .MuiTableCell-root': {
      padding: '4px 2px',
      borderBottom: 'none',
    },
  },
  rowLabelBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#6b7280',
  },
  imageRightBox: {
    flex: 0.9,
    height: 125,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f5f3ff',
    border: '1.5px solid #e0e7ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  imageMedia: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  actionsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTop: '1px solid #f3f4f6',
    marginTop: 6,
  },
  actionItemBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '4px 6px',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#f9fafb',
    },
    '&:disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
  },
  actionText: {
    fontSize: '0.68rem',
    fontWeight: 600,
    color: '#4b5563',
  },
  dialogPaper: {
    borderRadius: 24,
    overflow: 'hidden',
    maxWidth: 400,
    width: '90%',
    boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
  },
  dialogHeader: {
    background: 'linear-gradient(135deg, #d32f2f 0%, #9a0007 100%)',
    padding: theme.spacing(3, 2),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: '#ffffff',
  },
  dialogIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(1),
  },
  dialogContent: {
    padding: theme.spacing(3, 3, 1),
    textAlign: 'center',
  },
  dialogActions: {
    padding: theme.spacing(1.5, 3, 3),
    display: 'flex',
    gap: theme.spacing(1.5),
  },
}));

const formatShortAddress = (address) => {
  if (!address || typeof address !== 'string') return address;
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return address;

  const cleanParts = parts.filter(
    (p) => !/^\d{5}-?\d{3}$|^\d+$/.test(p) && !/^(BR|Brasil|Brazil)$/i.test(p),
  );

  if (cleanParts.length >= 4) {
    return `${cleanParts[0]}, ${cleanParts[2]}`;
  }
  if (cleanParts.length === 3) {
    return `${cleanParts[0]}, ${cleanParts[1]}`;
  }
  return cleanParts.join(', ');
};

const getRowIcon = (key) => {
  switch (key) {
    case 'fixTime':
      return <AccessTimeIcon sx={{ fontSize: 16, color: '#7c3aed' }} />;
    case 'address':
      return <PlaceIcon sx={{ fontSize: 16, color: '#7c3aed' }} />;
    case 'speed':
      return <SpeedIcon sx={{ fontSize: 16, color: '#7c3aed' }} />;
    case 'totalDistance':
      return <AltRouteIcon sx={{ fontSize: 16, color: '#7c3aed' }} />;
    default:
      return null;
  }
};

const StatusCard = ({ deviceId, position, onClose, disableActions, desktopPadding = 0 }) => {
  const { classes } = useStyles({ desktopPadding });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const device = useSelector((state) => state.devices.items[deviceId]);
  const deviceImage = device?.attributes?.deviceImage;

  const [expanded, setExpanded] = useState(true);
  const prevDeviceIdRef = useRef(null);

  const [isBlocked, setIsBlocked] = useState(() => {
    return localStorage.getItem(`device_blocked_${deviceId}`) === 'true';
  });

  const positionAttributes = usePositionAttributes(t);
  const positionItems = useAttributePreference(
    'positionItems',
    'fixTime,address,speed,totalDistance',
  );

  const [removing, setRemoving] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (deviceId && prevDeviceIdRef.current !== deviceId) {
      setExpanded(true);
      prevDeviceIdRef.current = deviceId;
    }
  }, [deviceId]);

  useEffect(() => {
    if (deviceId) {
      const saved = localStorage.getItem(`device_blocked_${deviceId}`) === 'true';
      const attr = position?.attributes || {};
      const devAttr = device?.attributes || {};
      const serverStatus = Boolean(
        attr.blocked === true ||
        attr.blocked === 1 ||
        attr.out1 === true ||
        attr.out1 === 1 ||
        attr.output1 === true ||
        attr.output1 === 1 ||
        attr.relay === true ||
        attr.relay === 1 ||
        attr.engine === false ||
        attr.engine === 0 ||
        devAttr.blocked === true ||
        devAttr.blocked === 1
      );
      setIsBlocked(saved || serverStatus);
    }
  }, [deviceId, position, device]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const sendSendCommand = async (type) => {
    try {
      const response = await fetch('/api/commands/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          deviceId,
          type,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }

      const blockedState = type === 'engineStop';
      setIsBlocked(blockedState);
      localStorage.setItem(`device_blocked_${deviceId}`, String(blockedState));

      setToast({
        message: blockedState ? 'Veículo bloqueado com sucesso!' : 'Veículo desbloqueado com sucesso!',
        severity: 'success',
      });
    } catch (error) {
      setToast({
        message: error.message || 'Erro ao enviar comando',
        severity: 'error',
      });
    }
  };

  const handleConfirmLock = () => {
    setConfirmLock(false);
    sendSendCommand('engineStop');
  };

  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetchOrThrow('/api/devices');
      dispatch(devicesActions.refresh(await response.json()));
    }
    setRemoving(false);
  });

  const isOnline = device?.status === 'online';
  const dotColor = isOnline ? '#16a34a' : '#dc2626';

  return (
    <>
      <style>{`
        @keyframes superBlinkRed {
          0% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 2px #ef4444); }
          50% { transform: scale(1.35); opacity: 0.15; filter: drop-shadow(0 0 16px #ef4444); }
          100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 2px #ef4444); }
        }
        .blinking-lock-active {
          animation: superBlinkRed 0.6s infinite ease-in-out !important;
          color: #ef4444 !important;
        }
      `}</style>

      <div className={classes.root}>
        {device && (
          <Rnd
            default={{ x: 0, y: 0, width: 'auto', height: 'auto' }}
            enableResizing={false}
            dragHandleClassName="draggable-header"
            style={{ position: 'relative' }}
          >
            <Card elevation={3} className={classes.card}>
              <Box className={classes.toggleTab} onClick={() => setExpanded(!expanded)}>
                {expanded ? (
                  <KeyboardArrowDownIcon sx={{ fontSize: 18, color: '#6c757d' }} />
                ) : (
                  <KeyboardArrowUpIcon sx={{ fontSize: 18, color: '#6c757d' }} />
                )}
              </Box>

              <div className="draggable-header">
                <Box className={classes.headerBox}>
                  <Box className={classes.headerLeft}>
                    <Avatar className={classes.avatar}>
                      <img
                        className={classes.vehicleIcon}
                        src={mapIcons[mapIconKey(device.category)]}
                        alt=""
                      />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1f2937', fontSize: '0.98rem', lineHeight: 1.2 }}>
                        {device.name}
                      </Typography>
                      <Box className={classes.statusRow}>
                        <Box className={classes.statusDot} sx={{ backgroundColor: dotColor }} />
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            color: dotColor,
                            textTransform: 'capitalize',
                          }}
                        >
                          {formatStatus(device.status, t)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={onClose} sx={{ color: '#4b5563' }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </div>

              <Collapse in={expanded} timeout={250}>
                <Box className={classes.mainBody}>
                  {position && (
                    <CardContent className={classes.contentLeft}>
                      <Table size="small" className={classes.table}>
                        <TableBody>
                          {positionItems
                            .split(',')
                            .filter(
                              (key) =>
                                position.hasOwnProperty(key) || position.attributes?.hasOwnProperty(key),
                            )
                            .map((key) => {
                              let content = (
                                <PositionValue
                                  position={position}
                                  property={position.hasOwnProperty(key) ? key : null}
                                  attribute={position.hasOwnProperty(key) ? null : key}
                                />
                              );
                              if (key === 'address' && position.address) {
                                content = formatShortAddress(position.address);
                              }
                              return (
                                <TableRow key={key}>
                                  <TableCell sx={{ width: '40%', verticalAlign: 'top' }}>
                                    <Box className={classes.rowLabelBox}>
                                      {getRowIcon(key)}
                                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', fontSize: '0.78rem' }}>
                                        {positionAttributes[key]?.name || key}
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell sx={{ verticalAlign: 'top' }}>
                                    <Typography variant="body2" sx={{ color: '#4b5563', fontSize: '0.78rem' }}>
                                      {content}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  )}

                  <Box className={classes.imageRightBox}>
                    {deviceImage ? (
                      <img
                        className={classes.imageMedia}
                        src={`/api/media/${device.uniqueId}/${deviceImage}`}
                        alt={device.name}
                      />
                    ) : (
                      <svg width="100%" height="100%" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="160" height="120" rx="12" fill="#F3E8FF" />
                        <path d="M-10 30 L60 -10 L170 50 L100 90 Z" fill="#E9D5FF" opacity="0.6" />
                        <path d="M20 70 L90 30 L160 80 L90 120 Z" fill="#DDD6FE" opacity="0.7" />
                        <path d="M-20 80 L50 40 L110 90 L40 130 Z" fill="#EDE9FE" opacity="0.8" />
                        <path d="M120 25 C90 25 140 65 110 85" stroke="#6D28D9" strokeWidth="2.5" strokeDasharray="4 4" fill="none" />
                        <circle cx="120" cy="25" r="3" fill="#6D28D9" />
                        <g transform="translate(100, 75)">
                          <circle cx="10" cy="10" r="9" fill="#6D28D9" />
                          <circle cx="10" cy="10" r="4.5" fill="#FFFFFF" />
                          <path d="M10 19 L10 24" stroke="#6D28D9" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                      </svg>
                    )}
                  </Box>
                </Box>
              </Collapse>

              <Box className={classes.actionsContainer}>
                <ButtonBase
                  className={classes.actionItemBtn}
                  onClick={() => setConfirmLock(true)}
                  disabled={disableActions || readonly}
                >
                  <LockIcon
                    className={isBlocked ? 'blinking-lock-active' : ''}
                    sx={{ fontSize: 22, color: '#dc2626' }}
                  />
                  <Typography
                    className={`${classes.actionText} ${isBlocked ? 'blinking-lock-active' : ''}`}
                    sx={{ color: isBlocked ? '#dc2626' : undefined }}
                  >
                    Bloquear
                  </Typography>
                </ButtonBase>

                <ButtonBase
                  className={classes.actionItemBtn}
                  onClick={() => sendSendCommand('engineResume')}
                  disabled={disableActions || readonly}
                >
                  <LockOpenIcon sx={{ fontSize: 22, color: '#16a34a' }} />
                  <Typography className={classes.actionText}>Desbloquear</Typography>
                </ButtonBase>

                <ButtonBase
                  className={classes.actionItemBtn}
                  onClick={() => navigate(`/replay?deviceId=${deviceId}`)}
                  disabled={disableActions || !position}
                >
                  <RouteIcon sx={{ fontSize: 22, color: '#6366f1' }} />
                  <Typography className={classes.actionText}>Rota</Typography>
                </ButtonBase>

                <ButtonBase
                  className={classes.actionItemBtn}
                  onClick={() => navigate(`/settings/device/${deviceId}`)}
                  disabled={disableActions || deviceReadonly}
                >
                  <EditIcon sx={{ fontSize: 22, color: '#3b82f6' }} />
                  <Typography className={classes.actionText}>Editar</Typography>
                </ButtonBase>

                <ButtonBase
                  className={classes.actionItemBtn}
                  onClick={() => setRemoving(true)}
                  disabled={disableActions || deviceReadonly}
                >
                  <DeleteIcon sx={{ fontSize: 22, color: '#ef4444' }} />
                  <Typography className={classes.actionText}>Excluir</Typography>
                </ButtonBase>
              </Box>
            </Card>
          </Rnd>
        )}
      </div>

      <Dialog
        open={confirmLock}
        onClose={() => setConfirmLock(false)}
        PaperProps={{
          className: classes.dialogPaper,
        }}
      >
        <Box className={classes.dialogHeader}>
          <Box className={classes.dialogIconWrapper}>
            <LockPersonIcon sx={{ fontSize: 28, color: '#ffffff' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Bloquear Veículo
          </Typography>
        </Box>

        <DialogContent className={classes.dialogContent}>
          <Typography variant="body1" sx={{ color: '#374151', lineHeight: 1.5 }}>
            Tem certeza que deseja enviar o comando de <strong>BLOQUEIO</strong> para o veículo?
          </Typography>
          <Box
            sx={{
              mt: 1.5,
              py: 0.8,
              px: 2,
              borderRadius: 2,
              backgroundColor: '#f3f4f6',
              display: 'inline-block',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#dc2626' }}>
              {device?.name}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions className={classes.dialogActions}>
          <Button
            onClick={() => setConfirmLock(false)}
            sx={{
              flex: 1,
              borderRadius: 2,
              color: '#6b7280',
              border: '1px solid #e5e7eb',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmLock}
            variant="contained"
            sx={{
              flex: 1,
              borderRadius: 2,
              backgroundColor: '#dc2626',
              textTransform: 'none',
              fontWeight: 700,
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
            }}
            autoFocus
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          top: { xs: 40, sm: 60 },
          zIndex: 99999,
        }}
      >
        {toast && (
          <Alert
            elevation={10}
            onClose={() => setToast(null)}
            severity={toast.severity}
            variant="filled"
            sx={{
              minWidth: 300,
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              backgroundColor: toast.severity === 'success' ? '#16a34a' : '#dc2626',
              color: '#ffffff',
            }}
          >
            {toast.message}
          </Alert>
        )}
      </Snackbar>

      <RemoveDialog
        open={removing}
        endpoint="devices"
        itemId={deviceId}
        onResult={(removed) => handleRemove(removed)}
      />
    </>
  );
};

export default StatusCard;