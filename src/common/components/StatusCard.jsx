import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import {
  Card,
  CardContent,
  Typography,
  CardActions,
  IconButton,
  Table,
  TableBody,
  TableRow,
  TableCell,
  CardMedia,
  Tooltip,
  Collapse,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  Alert,
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

import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import fetchOrThrow from '../util/fetchOrThrow';

const useStyles = makeStyles()((theme, { desktopPadding }) => ({
  card: {
    pointerEvents: 'auto',
    width: theme.dimensions.popupMaxWidth,
    borderRadius: 16,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 1, 0, 2),
    color: theme.palette.text.secondary,
  },
  media: {
    height: theme.dimensions.popupImageHeight,
    '& > div': {
      color: theme.palette.common.white,
      mixBlendMode: 'difference',
    },
  },
  content: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    maxHeight: theme.dimensions.cardContentMaxHeight,
    overflow: 'auto',
  },
  table: {
    '& .MuiTableCell-sizeSmall': {
      paddingLeft: 0,
      paddingRight: 0,
    },
    '& .MuiTableCell-sizeSmall:first-of-type': {
      paddingRight: theme.spacing(1),
    },
  },
  cell: {
    borderBottom: 'none',
  },
  actions: {
    justifyContent: 'space-around',
    padding: theme.spacing(0.5, 1),
  },
  togglePillTop: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '4px 0 0 0',
  },
  togglePillBtn: {
    backgroundColor: theme.palette.background.paper,
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    borderRadius: '12px',
    padding: '2px 14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    border: `1px solid ${theme.palette.divider}`,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      transform: 'scale(1.05)',
    },
  },
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

const StatusRow = ({ name, content }) => {
  const { classes } = useStyles({ desktopPadding: 0 });

  return (
    <TableRow>
      <TableCell className={classes.cell}>
        <Typography variant="body2">{name}</Typography>
      </TableCell>
      <TableCell className={classes.cell}>
        <Typography variant="body2" color="textSecondary">
          {content}
        </Typography>
      </TableCell>
    </TableRow>
  );
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

  const positionAttributes = usePositionAttributes(t);
  const positionItems = useAttributePreference(
    'positionItems',
    'fixTime,address,speed,totalDistance',
  );

  const [expanded, setExpanded] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (deviceId) {
      setExpanded(true);
    }
  }, [deviceId]);

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

      setToast({
        message: type === 'engineStop' ? 'Veículo bloqueado com sucesso!' : 'Veículo desbloqueado com sucesso!',
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

  return (
    <>
      <div className={classes.root}>
        {device && (
          <Rnd
            default={{ x: 0, y: 0, width: 'auto', height: 'auto' }}
            enableResizing={false}
            dragHandleClassName="draggable-header"
            style={{ position: 'relative' }}
          >
            <Card elevation={3} className={classes.card}>
              {expanded && (
                <Box className={classes.togglePillTop}>
                  <Box className={classes.togglePillBtn} onClick={() => setExpanded(false)}>
                    <Tooltip title="Recolher detalhes">
                      <KeyboardArrowDownIcon color="action" sx={{ fontSize: 20 }} />
                    </Tooltip>
                  </Box>
                </Box>
              )}

              <Collapse in={expanded} timeout={300}>
                <CardMedia
                  className={`draggable-header ${deviceImage ? classes.media : ''}`}
                  image={deviceImage && `/api/media/${device.uniqueId}/${deviceImage}`}
                >
                  <div className={classes.header}>
                    <Typography variant="body2" color="inherit">
                      {device.name}
                    </Typography>
                    <IconButton size="small" color="inherit" onClick={onClose} onTouchStart={onClose}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </div>
                </CardMedia>
                {position && (
                  <CardContent className={classes.content}>
                    <Table size="small" className={classes.table}>
                      <TableBody>
                        {positionItems
                          .split(',')
                          .filter(
                            (key) =>
                              position.hasOwnProperty(key) || position.attributes.hasOwnProperty(key),
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
                              <StatusRow
                                key={key}
                                name={positionAttributes[key]?.name || key}
                                content={content}
                              />
                            );
                          })}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Collapse>

              {!expanded && (
                <Box className={classes.togglePillTop}>
                  <Box className={classes.togglePillBtn} onClick={() => setExpanded(true)}>
                    <Tooltip title="Expandir detalhes">
                      <KeyboardArrowUpIcon color="action" sx={{ fontSize: 20 }} />
                    </Tooltip>
                  </Box>
                </Box>
              )}

              <CardActions className={classes.actions} disableSpacing>
                <Tooltip title="Bloquear Veículo">
                  <IconButton
                    color="error"
                    onClick={() => setConfirmLock(true)}
                    disabled={disableActions || readonly}
                  >
                    <LockIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Desbloquear Veículo">
                  <IconButton
                    color="success"
                    onClick={() => sendSendCommand('engineResume')}
                    disabled={disableActions || readonly}
                  >
                    <LockOpenIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('reportReplay')}>
                  <IconButton
                    onClick={() => navigate(`/replay?deviceId=${deviceId}`)}
                    disabled={disableActions || !position}
                  >
                    <RouteIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedEdit')}>
                  <IconButton
                    onClick={() => navigate(`/settings/device/${deviceId}`)}
                    disabled={disableActions || deviceReadonly}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedRemove')}>
                  <IconButton
                    color="error"
                    onClick={() => setRemoving(true)}
                    disabled={disableActions || deviceReadonly}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedClose')}>
                  <IconButton onClick={onClose}>
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Rnd>
        )}
      </div>

      <Dialog
        open={confirmLock}
        onClose={() => setConfirmLock(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            padding: 1,
            minWidth: 300,
            boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockIcon color="error" /> Bloquear Veículo
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.primary', fontSize: '0.95rem' }}>
            Tem certeza que deseja enviar o comando de <strong>BLOQUEIO</strong> para o veículo{' '}
            <strong>{device?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ padding: '8px 16px 12px' }}>
          <Button onClick={() => setConfirmLock(false)} color="inherit" sx={{ borderRadius: '8px' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmLock}
            variant="contained"
            color="error"
            sx={{ borderRadius: '8px', px: 3 }}
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
              backgroundColor: toast.severity === 'success' ? '#2e7d32' : '#d32f2f',
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