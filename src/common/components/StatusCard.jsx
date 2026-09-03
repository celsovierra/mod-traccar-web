import { AnchorButton } from "../../features/anchor/AnchorButton";
import { useAnchor } from "../../features/anchor/useAnchor";
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
  CircularProgress,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import RouteIcon from '@mui/icons-material/Route';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlaceIcon from '@mui/icons-material/Place';
import SpeedIcon from '@mui/icons-material/Speed';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import SyncIcon from '@mui/icons-material/Sync';
import QueryBuilderIcon from '@mui/icons-material/QueryBuilder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import { useDeviceReadonly, useRestriction, useAdministrator } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch } from '../../reactHelper';
import { usePreference } from '../util/preferences';
import fetchOrThrow from '../util/fetchOrThrow';
import { mapIconKey, mapIcons } from '../../map/core/preloadImages';
import { formatStatus, formatSpeed } from '../util/formatter';

// Ícone SVG Cerca
const FenceIcon = ({ sx = {}, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{
      width: sx.fontSize || 22,
      height: sx.fontSize || 22,
      color: sx.color || '#0d9488',
      display: 'inline-block',
      ...sx,
    }}
  >
    <path d="M5 6 L7 3 L9 6 L9 21 L5 21 Z" />
    <path d="M10 6 L12 3 L14 6 L14 21 L10 21 Z" />
    <path d="M15 6 L17 3 L19 6 L19 21 L15 21 Z" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="16" x2="21" y2="16" />
  </svg>
);

const formatDateTimeBr = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const useStyles = makeStyles()((theme) => ({
  root: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 1300,
    bottom: theme.spacing(3),
    left: '50%',
    transform: 'translateX(-50%)',
    [theme.breakpoints.up('md')]: {
      left: 'calc(50% + 140px)',
      bottom: theme.spacing(3),
    },
    [theme.breakpoints.down('sm')]: {
      left: '50%',
      bottom: theme.spacing(1.5),
    },
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
    gap: 10,
    flex: 1,
    overflow: 'hidden',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  speedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    color: '#ffffff',
    padding: '4px 10px',
    borderRadius: 12,
    boxShadow: '0 2px 6px rgba(124, 58, 237, 0.35)',
  },
  speedNumber: {
    fontWeight: 800,
    fontSize: '0.85rem',
    lineHeight: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    backgroundColor: '#ede9fe',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '2px solid #ddd6fe',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  vehicleIcon: {
    width: 26,
    height: 26,
    filter: 'invert(27%) sepia(85%) saturate(2250%) hue-rotate(242deg) brightness(92%) contrast(98%)',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '2px',
    flexWrap: 'wrap',
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
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
  vehicleModelBadge: {
    marginTop: 6,
    marginBottom: 2,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '3px 8px',
    width: 'fit-content',
    maxWidth: '100%',
  },
  vehicleModelText: {
    fontSize: '0.74rem',
    fontWeight: 700,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  mercosulPlateContainer: {
    marginTop: 7,
    marginBottom: 2,
    width: 155,
    height: 48,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    border: '2.5px solid #111827',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 3px 8px rgba(0,0,0,0.22)',
    boxSizing: 'border-box',
  },
  mercosulTopBar: {
    height: 14,
    backgroundColor: '#003399',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 5px',
    color: '#ffffff',
  },
  mercosulFlag: {
    width: 15,
    height: 10,
    borderRadius: 1,
  },
  mercosulText: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '0.48rem',
    fontWeight: 900,
    letterSpacing: 2,
    color: '#ffffff',
    textAlign: 'center',
    WebkitFontSmoothing: 'antialiased',
  },
  mercosulPlateBody: {
    flex: 1,
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
    position: 'relative',
  },
  mercosulLetters: {
    fontFamily: '"Lucida Console", "Consolas", "Courier New", "Trebuchet MS", sans-serif',
    fontWeight: 700,
    fontSize: '1.15rem',
    letterSpacing: 2.5,
    color: '#111827',
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 1,
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    textRendering: 'optimizeLegibility',
  },
  mercosulQrCode: {
    position: 'absolute',
    left: 4,
    top: 3,
    width: 13,
    height: 13,
  },
  mercosulBr: {
    position: 'absolute',
    left: 4,
    bottom: 2,
    fontSize: '0.45rem',
    fontWeight: 900,
    color: '#111827',
    lineHeight: 1,
    WebkitFontSmoothing: 'antialiased',
  },
  actionsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTop: '1px solid #f3f4f6',
    marginTop: 6,
    gap: 6,
  },
  lockRectangleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 110,
    height: 36,
    padding: '6px 14px',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    color: '#ffffff !important',
    fontWeight: 700,
    fontSize: '0.76rem',
    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
    whiteSpace: 'nowrap',
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
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
  geofenceDialogPaper: {
    background: 'linear-gradient(180deg, #111827 0%, #0b0f19 100%)',
    borderRadius: '24px !important',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#f8fafc',
    maxWidth: '430px !important',
    width: '92% !important',
    margin: '12px auto !important',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05) !important',
    overflow: 'hidden',
  },
  customSuccessToast: {
    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%) !important',
    color: '#065f46 !important',
    border: '1.5px solid #6ee7b7',
    borderRadius: '20px !important',
    boxShadow: '0 12px 30px rgba(16, 185, 129, 0.25) !important',
    padding: '10px 18px !important',
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
    default:
      return null;
  }
};

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const createCircleWkt = (latitude, longitude, radiusInMeters = 50, points = 32) => {
  const km = radiusInMeters / 1000;
  const coords = [];
  const distanceX = km / (111.32 * Math.cos((latitude * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i += 1) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push(`${latitude + y} ${longitude + x}`);
  }
  coords.push(coords[0]);
  return `POLYGON((${coords.join(', ')}))`;
};

const getImageUrl = (device) => {
  const rawImage =
    device?.attributes?.deviceImage ||
    device?.attributes?.image ||
    device?.attributes?.photo ||
    device?.attributes?.vehicleImage;

  if (!rawImage) return null;
  if (rawImage.startsWith('data:') || rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
    return rawImage;
  }
  return `/api/media/${device.uniqueId}/${rawImage}`;
};

const StatusCard = ({ deviceId, position, onClose, disableActions }) => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const speedUnit = usePreference('speedUnit', 'kmh');
  const user = useSelector((state) => state.session.user);
  const admin = useAdministrator();
  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const device = useSelector((state) => state.devices.items[deviceId]);
  const deviceImage = getImageUrl(device);

  const vehiclePlate = device?.attributes?.plate || '';
  const vehicleModel = device?.model || '';

  const isIgnitionOn = Boolean(
    position?.attributes?.ignition ?? position?.attributes?.acc ?? false
  );
  const ignitionColor = isIgnitionOn ? '#16a34a' : '#dc2626';

  const isTrulyCommunicating = () => {
    if (!device) return false;
    if (device.status === 'online') return true;
    const timeRef = position?.fixTime || device?.lastUpdate;
    if (!timeRef) return false;
    const diffMinutes = (Date.now() - new Date(timeRef).getTime()) / 60000;
    return diffMinutes <= 15;
  };

  const isOnline = isTrulyCommunicating();
  const dotColor = isOnline ? '#16a34a' : '#dc2626';

  const [expanded, setExpanded] = useState(false);
  const { isAnchorActive, toggleAnchor, loadingAnchor } = useAnchor(deviceId, device, position);
  const prevDeviceIdRef = useRef(null);
  const [loadingCommand, setLoadingCommand] = useState(false);

  const autoLockTriggered = useRef(false);

  const [geofenceModalOpen, setGeofenceModalOpen] = useState(false);
  const [deviceGeofences, setDeviceGeofences] = useState([]);
  const [loadingGeofences, setLoadingGeofences] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState(null);

  const getIsBlockedReal = (pos = position, dev = device) => {
    const posAttr = pos?.attributes || {};
    const devAttr = dev?.attributes || {};
    const local = localStorage.getItem(`device_blocked_${deviceId}`);

    if (devAttr.blocked !== undefined) return Boolean(devAttr.blocked);
    if (posAttr.blocked !== undefined) return Boolean(posAttr.blocked);
    if (posAttr.out1 !== undefined) return Boolean(posAttr.out1);
    if (posAttr.output1 !== undefined) return Boolean(posAttr.output1);
    if (posAttr.relay !== undefined) return Boolean(posAttr.relay);

    return local === 'true';
  };

  const [isBlocked, setIsBlocked] = useState(() => {
    const local = localStorage.getItem(`device_blocked_${deviceId}`);
    if (local === "false") return false;
    if (local === "true") return true;
    return getIsBlockedReal();
  });
  const [isUnlockPending, setIsUnlockPending] = useState(() => {
    return localStorage.getItem(`device_unlock_pending_${deviceId}`) === 'true';
  });



  const positionAttributes = usePositionAttributes(t);
  const positionItems = 'fixTime,address';

  const [removing, setRemoving] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (deviceId && prevDeviceIdRef.current !== deviceId) {
      setExpanded(false);
      prevDeviceIdRef.current = deviceId;
      autoLockTriggered.current = false;
      setIsBlocked(getIsBlockedReal());
      setIsUnlockPending(localStorage.getItem(`device_unlock_pending_${deviceId}`) === 'true');
    }
  }, [deviceId, device]);

  useEffect(() => {
    if (deviceId) {
      const realStatus = getIsBlockedReal();
      if (isOnline) {
        if (isUnlockPending) {
          sendSendCommand('engineResume');
        } else if (realStatus) {
          setIsBlocked(true);
        }
      } else if (realStatus) {
        setIsBlocked(true);
      }
    }
  }, [deviceId, position, device, isOnline, isUnlockPending]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const sendSendCommand = async (type) => {
    const isStop = type === 'engineStop';

    if (isStop && !isOnline) {
      setToast({
        message: 'Veículo OFFLINE! Não é possível enviar comando de bloqueio.',
        severity: 'error',
      });
      return;
    }

    setLoadingCommand(true);

    try {
      const response = await fetch('/api/commands/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          deviceId: Number(deviceId),
          type,
        }),
      });

      if (!response.ok && isStop) {
        throw new Error('Falha ao enviar comando de bloqueio ao rastreador.');
      }

      if (isStop) {
        setIsBlocked(true);
        setIsUnlockPending(false);
        localStorage.setItem(`device_blocked_${deviceId}`, 'true');
        localStorage.removeItem(`device_unlock_pending_${deviceId}`);

        if (device) {
          const updatedDevice = {
            ...device,
            attributes: { ...device.attributes, blocked: true },
          };
          dispatch(devicesActions.update([updatedDevice]));
          fetch(`/api/devices/${deviceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(updatedDevice),
          }).catch(() => {});
        }

        setToast({
          message: 'Bloqueio efetuado com sucesso!',
          severity: 'success',
        });
      } else {
        autoLockTriggered.current = false;
        if (isOnline) {
          setIsBlocked(false);
          setIsUnlockPending(false);
          localStorage.removeItem(`device_blocked_${deviceId}`);
          localStorage.removeItem(`device_unlock_pending_${deviceId}`);

          if (device) {
            const updatedDevice = {
              ...device,
              attributes: { ...device.attributes, blocked: false },
            };
            dispatch(devicesActions.update([updatedDevice]));
            fetch(`/api/devices/${deviceId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify(updatedDevice),
            }).catch(() => {});
          }

          setToast({
            message: 'Desbloqueio efetuado com sucesso!',
            severity: 'success',
          });
        } else {
          setIsUnlockPending(true);
          localStorage.setItem(`device_unlock_pending_${deviceId}`, 'true');

          setToast({
            message: 'Desbloqueio agendado! Será executado assim que o veículo ficar online.',
            severity: 'warning',
          });
        }
      }
    } catch (error) {
      setToast({
        message: error.message || 'Erro ao enviar comando',
        severity: 'error',
      });
    } finally {
      setLoadingCommand(false);
    }
  };

  useEffect(() => {
    if (isAnchorActive && position && !isBlocked && !autoLockTriggered.current) {
      if (anchor) {
        const distance = calculateDistanceMeters(
          anchor.latitude,
          anchor.longitude,
          position.latitude,
          position.longitude,
        );

        if (distance > (anchor.radius || 50)) {
          autoLockTriggered.current = true;
          sendSendCommand('engineStop');
          setToast({
            severity: 'error',
          });
        }
      }
    }
  }, [position, isAnchorActive, isBlocked, deviceId, device]);

  const handleConfirmLock = () => {
    setConfirmLock(false);
    sendSendCommand('engineStop');
  };

  const handleToggleBlock = () => {
    if (isUnlockPending) {
      setToast({
        message: 'Aguardando veículo ficar online para concluir o desbloqueio.',
        severity: 'warning',
      });
      return;
    }

    if (isBlocked) {
      sendSendCommand('engineResume');
    } else {
      if (!isOnline) {
        setToast({
          message: 'Veículo OFFLINE! Não é possível enviar comando de bloqueio.',
          severity: 'error',
        });
        return;
      }
      setConfirmLock(true);
    }
  };

  const removeAllAnchorGeofences = async () => {
    try {
      const geoRes = await fetch('/api/geofences', { credentials: 'same-origin' });
      if (geoRes.ok) {
        const list = await geoRes.json();
        const toDelete = list.filter((g) => g.name && g.name.includes(prefix));

        await Promise.all(
          toDelete.map((g) =>
            fetch(`/api/geofences/${g.id}`, {
              method: 'DELETE',
              credentials: 'same-origin',
            }),
          ),
        );
      }
    } catch (e) {}
  };

  const handleToggleAnchor = async () => {
    if (loadingAnchor) return;
    setLoadingAnchor(true);

    if (isAnchorActive) {
      setIsAnchorActive(false);
      autoLockTriggered.current = false;

      await removeAllAnchorGeofences();

      if (device) {
        const updatedAttributes = { ...device.attributes };
        delete updatedAttributes.anchor;
        const updatedDevice = { ...device, attributes: updatedAttributes };
        dispatch(devicesActions.update([updatedDevice]));

        await fetch(`/api/devices/${deviceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(updatedDevice),
        }).catch(() => {});
      }

      window.dispatchEvent(new CustomEvent('anchorUpdate'));
      await sendSendCommand('engineResume');

      setLoadingAnchor(false);
    } else if (position) {
      await removeAllAnchorGeofences();

      let createdGeofenceId = null;

      try {
        const wktArea = createCircleWkt(position.latitude, position.longitude, 50);
        const geoResponse = await fetch('/api/geofences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            area: wktArea,
            attributes: { color: '#ef4444' },
          }),
        });

        if (geoResponse.ok) {
          const newGeofence = await geoResponse.json();
          createdGeofenceId = newGeofence.id;

          await fetch('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              deviceId: Number(deviceId),
              geofenceId: createdGeofenceId,
            }),
          }).catch(() => {});

          if (user?.id) {
            await fetch('/api/permissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({
                userId: Number(user.id),
                geofenceId: createdGeofenceId,
              }),
            }).catch(() => {});
          }
        }
      } catch (e) {}

      const anchorData = {
        deviceId: Number(deviceId),
        latitude: position.latitude,
        longitude: position.longitude,
        radius: 50,
        geofenceId: createdGeofenceId,
      };


      if (device) {
        const updatedDevice = {
          ...device,
          attributes: {
            ...device.attributes,
            anchor: anchorData,
          },
        };
        dispatch(devicesActions.update([updatedDevice]));

        await fetch(`/api/devices/${deviceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(updatedDevice),
        }).catch(() => {});
      }

      autoLockTriggered.current = false;
      setIsAnchorActive(true);
      window.dispatchEvent(new CustomEvent('anchorUpdate'));
      setLoadingAnchor(false);
    } else {
      setLoadingAnchor(false);
    }
  };

  const handleOpenGeofences = async () => {
    setGeofenceModalOpen(true);
    setLoadingGeofences(true);
    try {
      const [devGeoRes, allGeoRes] = await Promise.all([
        fetchOrThrow(`/api/geofences?deviceId=${deviceId}`),
        fetchOrThrow('/api/geofences?all=true').catch(() => fetchOrThrow('/api/geofences')),
      ]);

      const linkedList = await devGeoRes.json();
      const allGeofences = await allGeoRes.json();

      const linkedMap = new Map();
      linkedList
        .forEach((g) => linkedMap.set(g.id, { ...g, linked: true }));

      const snoozeMap = { ...(device?.attributes?.geofenceSnooze || {}) };
      const now = Date.now();
      let hasChanges = false;

      for (const [gIdStr, snoozeUntil] of Object.entries(snoozeMap)) {
        const gId = Number(gIdStr);
        if (now >= snoozeUntil) {
          try {
            await fetch('/api/permissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({ deviceId: Number(deviceId), geofenceId: gId }),
            });
            delete snoozeMap[gIdStr];
            hasChanges = true;

            const geoObj = allGeofences.find((g) => g.id === gId);
            if (geoObj) {
              linkedMap.set(gId, { ...geoObj, linked: true });
            }
          } catch (e) {}
        } else {
          const geoObj = allGeofences.find((g) => g.id === gId);
          if (geoObj && !linkedMap.has(gId)) {
            linkedMap.set(gId, { ...geoObj, linked: false, snoozeUntil });
          }
        }
      }

      if (hasChanges && device) {
        const updatedDevice = {
          ...device,
          attributes: { ...device.attributes, geofenceSnooze: snoozeMap },
        };
        dispatch(devicesActions.update([updatedDevice]));
        fetch(`/api/devices/${deviceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(updatedDevice),
        }).catch(() => {});
      }

      setDeviceGeofences(Array.from(linkedMap.values()));
    } catch (e) {
      setToast({ message: 'Erro ao buscar cercas virtuais.', severity: 'error' });
    } finally {
      setLoadingGeofences(false);
    }
  };

  const handleUnlinkGeofence = async (geofence) => {
    setUnlinkingId(geofence.id);
    const snoozeUntil = Date.now() + 12 * 60 * 60 * 1000;

    try {
      await fetchOrThrow('/api/permissions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: Number(deviceId),
          geofenceId: Number(geofence.id),
        }),
      });

      const currentSnooze = { ...(device?.attributes?.geofenceSnooze || {}) };
      currentSnooze[geofence.id] = snoozeUntil;

      if (device) {
        const updatedDevice = {
          ...device,
          attributes: { ...device.attributes, geofenceSnooze: currentSnooze },
        };
        dispatch(devicesActions.update([updatedDevice]));
        await fetch(`/api/devices/${deviceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(updatedDevice),
        }).catch(() => {});
      }

      setDeviceGeofences((prev) =>
        prev.map((g) => (g.id === geofence.id ? { ...g, linked: false, snoozeUntil } : g))
      );

      await sendSendCommand('engineResume');

      setToast({
        customSuccess: true,
        title: `${geofence.name} desvinculada!`,
        subtitle: `Desbloqueio disparado. Cerca reativa em ${formatDateTimeBr(snoozeUntil)}.`,
      });
    } catch (e) {
      setToast({ message: 'Erro ao desvincular cerca.', severity: 'error' });
    } finally {
      setUnlinkingId(null);
    }
  };

  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetchOrThrow('/api/devices');
      dispatch(devicesActions.refresh(await response.json()));
    }
    setRemoving(false);
  });

  return (
    <>
      <style>{`
        @keyframes pulseYellow {
          0% { background-color: #d97706; }
          50% { background-color: #f59e0b; }
          100% { background-color: #d97706; }
        }
        .blinking-pending-btn {
          animation: pulseYellow 0.9s infinite ease-in-out !important;
          background-color: #d97706 !important;
        }

        @keyframes superBlinkRed {
          0% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 2px #dc2626); }
          50% { opacity: 0.2; transform: scale(1.25); filter: drop-shadow(0 0 10px #dc2626); }
          100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 2px #dc2626); }
        }
          animation: superBlinkRed 0.7s infinite ease-in-out !important;
          color: #dc2626 !important;
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
                      {deviceImage ? (
                        <img
                          className={classes.avatarImg}
                          src={deviceImage}
                          alt={device.name}
                        />
                      ) : (
                        <img
                          className={classes.vehicleIcon}
                          src={mapIcons[mapIconKey(device.category)]}
                          alt=""
                        />
                      )}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="subtitle1"
                        noWrap
                        sx={{ fontWeight: 700, color: '#1f2937', fontSize: '0.98rem', lineHeight: 1.2 }}
                      >
                        {device.name}
                      </Typography>
                      <Box className={classes.statusRow}>
                        <Box className={classes.statusItem}>
                          <Box className={classes.statusDot} sx={{ backgroundColor: dotColor }} />
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              color: dotColor,
                              textTransform: 'capitalize',
                            }}
                          >
                            {isOnline ? formatStatus(device.status, t) : 'Offline'}
                          </Typography>
                        </Box>

                        <Box className={classes.statusItem}>
                          <VpnKeyIcon sx={{ fontSize: 13, color: ignitionColor, transform: 'rotate(-45deg)' }} />
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              color: ignitionColor,
                            }}
                          >
                            {isIgnitionOn ? 'Ignição ligada' : 'Ignição desligada'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  <Box className={classes.headerRight}>
                    <Box className={classes.speedBadge}>
                      <SpeedIcon sx={{ fontSize: 16 }} />
                      <Typography className={classes.speedNumber}>
                        {position ? formatSpeed(position.speed, speedUnit, t) : '0 km/h'}
                      </Typography>
                    </Box>

                    <IconButton size="small" onClick={onClose} sx={{ color: '#4b5563' }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
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

                      {vehicleModel && (
                        <Box className={classes.vehicleModelBadge}>
                          <DirectionsCarIcon sx={{ fontSize: 14, color: '#6b7280' }} />
                          <Typography className={classes.vehicleModelText}>
                            {vehicleModel}
                          </Typography>
                        </Box>
                      )}

                      <Box className={classes.mercosulPlateContainer}>
                        <Box className={classes.mercosulTopBar}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <svg width="7" height="7" viewBox="0 0 10 10">
                              <circle cx="5" cy="1.5" r="1.2" fill="#ffffff" />
                              <circle cx="1.5" cy="5" r="1.2" fill="#ffffff" />
                              <circle cx="8.5" cy="5" r="1.2" fill="#ffffff" />
                              <circle cx="5" cy="8.5" r="1.2" fill="#ffffff" />
                            </svg>
                            <Typography sx={{ fontSize: '0.38rem', fontWeight: 900, color: '#ffffff', letterSpacing: 0.5, lineHeight: 1 }}>
                              MERCOSUL
                            </Typography>
                          </Box>
                          <Typography className={classes.mercosulText}>BRASIL</Typography>
                          <svg className={classes.mercosulFlag} viewBox="0 0 20 14">
                            <rect width="20" height="14" fill="#009c3b" />
                            <polygon points="10,2 18,7 10,12 2,7" fill="#ffdf00" />
                            <circle cx="10" cy="7" r="3.2" fill="#002776" />
                          </svg>
                        </Box>
                        <Box className={classes.mercosulPlateBody}>
                          <svg className={classes.mercosulQrCode} viewBox="0 0 24 24" fill="#111827">
                            <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v4h-4v-4zm-4-2h2v4h-2v-4zm4-2h2v2h-2v-2zm-2 6h2v4h-2v-4z" />
                          </svg>
                          <span className={classes.mercosulBr}>BR</span>
                          <Typography className={classes.mercosulLetters}>
                            {vehiclePlate}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  )}

                  <Box className={classes.imageRightBox}>
                    {deviceImage ? (
                      <img
                        className={classes.imageMedia}
                        src={deviceImage}
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
                  className={`${classes.lockRectangleBtn} ${
                    isUnlockPending ? 'blinking-pending-btn' : ''
                  }`}
                  onClick={handleToggleBlock}
                  disabled={disableActions || readonly || loadingCommand}
                  sx={{
                    backgroundColor: isUnlockPending
                      ? '#d97706'
                      : isBlocked
                      ? '#16a34a'
                      : '#dc2626',
                    '&:hover': {
                      backgroundColor: isUnlockPending
                        ? '#b45309'
                        : isBlocked
                        ? '#15803d'
                        : '#b91c1c',
                    },
                  }}
                >
                  {loadingCommand ? (
                    <CircularProgress size={16} sx={{ color: '#ffffff' }} />
                  ) : isUnlockPending ? (
                    <>
                      <HourglassEmptyIcon sx={{ fontSize: 18, color: '#ffffff' }} />
                      <span>Aguardando</span>
                    </>
                  ) : isBlocked ? (
                    <>
                      <LockOpenIcon sx={{ fontSize: 18, color: '#ffffff' }} />
                      <span>Desbloquear</span>
                    </>
                  ) : (
                    <>
                      <LockIcon sx={{ fontSize: 18, color: '#ffffff' }} />
                      <span>Bloquear</span>
                    </>
                  )}
                </ButtonBase>

                {/* Botão de Âncora do Módulo Isolado */}
                <AnchorButton
                  isAnchorActive={isAnchorActive}
                  onClick={toggleAnchor}
                  disabled={disableActions || !position || loadingAnchor}
                  classes={classes}
                />

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
                  onClick={handleOpenGeofences}
                  disabled={disableActions}
                >
                  <FenceIcon sx={{ fontSize: 22, color: '#0d9488' }} />
                  <Typography className={classes.actionText}>Cerca</Typography>
                </ButtonBase>

                {admin && (
                  <>
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
                  </>
                )}
              </Box>
            </Card>
          </Rnd>
        )}
      </div>

      <Dialog
        open={geofenceModalOpen}
        onClose={() => setGeofenceModalOpen(false)}
        PaperProps={{
          className: classes.geofenceDialogPaper,
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pb: 1.8,
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(14, 165, 233, 0.05) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FenceIcon sx={{ fontSize: 20, color: '#38bdf8' }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.92rem', sm: '1rem' }, color: '#ffffff', lineHeight: 1.2 }}>
                  Cercas Virtuais
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    color: '#94a3b8',
                    fontWeight: 600,
                    maxWidth: { xs: 180, sm: 240 },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mt: 0.2,
                  }}
                >
                  {device?.name}
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={() => setGeofenceModalOpen(false)}
              sx={{
                color: '#64748b',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '10px',
                p: 0.6,
                '&:hover': { color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.1)' },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {loadingGeofences ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress size={30} sx={{ color: '#38bdf8' }} />
            </Box>
          ) : deviceGeofences.length === 0 ? (
            <Box
              sx={{
                py: 4,
                px: 2,
                textAlign: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px dashed rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
              }}
            >
              <Typography sx={{ fontSize: '0.84rem', color: '#94a3b8', fontWeight: 600 }}>
                Nenhuma cerca virtual vinculada a este veículo.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
              {deviceGeofences.map((geofence) => {
                const isPaused = !geofence.linked && geofence.snoozeUntil;

                return (
                  <Box
                    key={geofence.id}
                    sx={{
                      background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '18px',
                      p: { xs: 1.6, sm: 1.8 },
                      border: isPaused ? '1px solid rgba(234, 179, 8, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.4,
                      transition: 'all 0.2s',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, minWidth: 0, flex: 1 }}>
                        <Box
                          sx={{
                            width: 42,
                            height: 42,
                            borderRadius: '12px',
                            background: isPaused
                              ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(202, 138, 4, 0.05) 100%)'
                              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(79, 70, 229, 0.08) 100%)',
                            border: isPaused ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isPaused ? (
                            <SyncIcon sx={{ fontSize: 22, color: '#eab308' }} />
                          ) : (
                            <FenceIcon sx={{ fontSize: 20, color: '#818cf8' }} />
                          )}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: { xs: '0.86rem', sm: '0.92rem' },
                              color: '#f8fafc',
                              textTransform: 'uppercase',
                              letterSpacing: 0.3,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.2,
                            }}
                          >
                            {geofence.name}
                          </Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, mt: 0.3 }}>
                            {geofence.description || 'Polígono'}
                          </Typography>
                        </Box>
                      </Box>

                      {!isPaused && (
                        <ButtonBase
                          onClick={() => handleUnlinkGeofence(geofence)}
                          disabled={unlinkingId === geofence.id}
                          sx={{
                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            color: '#ffffff',
                            borderRadius: '12px',
                            px: { xs: 1.4, sm: 1.8 },
                            py: { xs: 0.8, sm: 1 },
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.6,
                            fontWeight: 700,
                            fontSize: { xs: '0.74rem', sm: '0.78rem' },
                            flexShrink: 0,
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                              transform: 'scale(1.02)',
                            },
                            '&:disabled': {
                              opacity: 0.6,
                            },
                          }}
                        >
                          {unlinkingId === geofence.id ? (
                            <CircularProgress size={14} sx={{ color: '#ffffff' }} />
                          ) : (
                            <>
                              <LockOpenOutlinedIcon sx={{ fontSize: 16 }} />
                              <span>Desvincular</span>
                            </>
                          )}
                        </ButtonBase>
                      )}
                    </Box>

                    {isPaused && (
                      <Box
                        sx={{
                          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.12) 0%, rgba(202, 138, 4, 0.04) 100%)',
                          border: '1px solid rgba(234, 179, 8, 0.25)',
                          borderRadius: '12px',
                          p: { xs: 1.2, sm: 1.4 },
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.2,
                        }}
                      >
                        <QueryBuilderIcon sx={{ color: '#facc15', fontSize: 20, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: { xs: '0.74rem', sm: '0.78rem' }, color: '#fef08a', fontWeight: 600, lineHeight: 1.3 }}>
                          Cerca desvinculada! Ficará ativa novamente em{' '}
                          <strong style={{ color: '#ffffff', fontWeight: 800 }}>{formatDateTimeBr(geofence.snoozeUntil)}</strong>
                        </Typography>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Dialog>

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
          top: { xs: 24, sm: 36 },
          zIndex: 99999,
          maxWidth: { xs: '92vw', sm: 420 },
        }}
      >
        {toast && (
          toast.customSuccess ? (
            <Box
              className={classes.customSuccessToast}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                width: '100%',
              }}
            >
              <CheckCircleIcon sx={{ color: '#059669', fontSize: 28, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.86rem', color: '#065f46', lineHeight: 1.2 }}>
                  {toast.title}
                </Typography>
                <Typography sx={{ fontWeight: 600, fontSize: '0.76rem', color: '#047857', mt: 0.3 }}>
                  {toast.subtitle}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Alert
              elevation={10}
              onClose={() => setToast(null)}
              severity={toast.severity}
              variant="filled"
              sx={{
                width: '100%',
                fontSize: '0.95rem',
                fontWeight: 600,
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                backgroundColor:
                  toast.severity === 'success'
                    ? '#16a34a'
                    : toast.severity === 'warning'
                    ? '#d97706'
                    : '#dc2626',
                color: '#ffffff',
              }}
            >
              {toast.message}
            </Alert>
          )
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