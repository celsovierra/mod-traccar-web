import { useEffect, useState, createElement as h } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import dimensions from '../../common/theme/dimensions';
import { map } from '../core/MapView';
import { usePrevious } from '../../reactHelper';
import { useAttributePreference } from '../../common/util/preferences';
import { toMapCoordinates } from '../core/mapUtil';
import { devicesActions } from '../../store';

const MapSelectedDevice = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();

  const currentTime = useSelector((state) => state.devices.selectTime);
  const currentId = useSelector((state) => state.devices.selectedId);
  const previousTime = usePrevious(currentTime);
  const previousId = usePrevious(currentId);

  const selectZoom = useAttributePreference('web.selectZoom', 10);
  const mapFollow = useAttributePreference('mapFollow', false);

  const position = useSelector((state) => state.session.positions[currentId]);
  const device = useSelector((state) => state.devices.items[currentId]);

  const previousPosition = usePrevious(position);

  const [openEdit, setOpenEdit] = useState(false);
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');

  useEffect(() => {
    if (device) {
      setModel(device.model || '');
      setPlate(device.attributes?.plate || device.attributes?.registration || '');
    }
  }, [device]);

  useEffect(() => {
    const positionChanged =
      position &&
      (!previousPosition ||
        position.latitude !== previousPosition.latitude ||
        position.longitude !== previousPosition.longitude);

    if (
      (currentId !== previousId ||
        currentTime !== previousTime ||
        (mapFollow && positionChanged)) &&
      position
    ) {
      map.easeTo({
        center: toMapCoordinates(position.longitude, position.latitude),
        zoom: Math.max(map.getZoom(), selectZoom),
        offset: [0, -dimensions.popupMapOffset / 2],
      });
    }
  }, [
    currentId,
    previousId,
    currentTime,
    previousTime,
    mapFollow,
    position,
    previousPosition,
    selectZoom,
  ]);

  const handleSave = async () => {
    if (!device) return;

    const updatedDevice = {
      ...device,
      model: model,
      attributes: {
        ...device.attributes,
        plate: plate,
      },
    };

    setOpenEdit(false);

    try {
      const response = await fetch(`/api/devices/${device.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updatedDevice),
      });

      if (response.ok) {
        const result = await response.json();
        dispatch(devicesActions.update({ [result.id]: result }));
        dispatch(devicesActions.update([result]));
      } else {
        dispatch(devicesActions.update({ [device.id]: updatedDevice }));
        dispatch(devicesActions.update([updatedDevice]));
      }
    } catch (e) {
      console.error(e);
      dispatch(devicesActions.update({ [device.id]: updatedDevice }));
      dispatch(devicesActions.update([updatedDevice]));
    }
  };

  useEffect(() => {
    const handleOpenEditModal = () => {
      if (currentId) setOpenEdit(true);
    };
    window.addEventListener('openDeviceEditModal', handleOpenEditModal);
    return () => window.removeEventListener('openDeviceEditModal', handleOpenEditModal);
  }, [currentId]);

  useEffect(() => {
    const handleClick = (e) => {
      const target = e.target.closest('div, span, img');
      if (
        target &&
        (target.textContent?.includes('BR') ||
          target.querySelector('img[alt*="mercosul" i]') ||
          target.className?.includes('mercosul'))
      ) {
        e.stopPropagation();
        e.preventDefault();
        if (currentId) {
          setOpenEdit(true);
        }
      }
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [currentId]);

  return h(Dialog, { 
    open: openEdit, 
    onClose: () => setOpenEdit(false), 
    maxWidth: 'xs', 
    fullWidth: true,
    PaperProps: {
      sx: {
        borderRadius: '16px',
        p: 1,
        m: 2,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
      }
    }
  },
    h(DialogTitle, { sx: { m: 0, p: 2, fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' } },
      'Editar Veículo',
      h(IconButton, {
        'aria-label': 'close',
        onClick: () => setOpenEdit(false),
        sx: { position: 'absolute', right: 12, top: 12, color: (t) => t.palette.grey[500] }
      }, h(CloseIcon))
    ),
    h(DialogContent, { dividers: false, sx: { px: 2, py: 1 } },
      h(TextField, {
        margin: 'normal',
        label: 'Modelo do Veículo',
        fullWidth: true,
        variant: 'outlined',
        size: 'medium',
        value: model,
        onChange: (e) => setModel(e.target.value),
        sx: { '& .MuiOutlinedInput-root': { borderRadius: '12px' } }
      }),
      h(TextField, {
        margin: 'normal',
        label: 'Placa do Veículo',
        fullWidth: true,
        variant: 'outlined',
        size: 'medium',
        value: plate,
        onChange: (e) => setPlate(e.target.value),
        sx: { '& .MuiOutlinedInput-root': { borderRadius: '12px' } }
      })
    ),
    h(DialogActions, { sx: { p: 2, gap: 1 } },
      h(Button, { 
        onClick: () => setOpenEdit(false),
        fullWidth: true,
        variant: 'outlined',
        sx: { borderRadius: '12px', py: 1.2, textTransform: 'none', fontWeight: 600 }
      }, 'Cancelar'),
      h(Button, { 
        onClick: handleSave, 
        variant: 'contained',
        fullWidth: true,
        sx: { borderRadius: '12px', py: 1.2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }
      }, 'Salvar')
    )
  );
};

export default MapSelectedDevice;