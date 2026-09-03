import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useMediaQuery, Button, TextField, Typography, Box, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { devicesActions } from '../../store';
import { useCatch } from '../../reactHelper';

const MapSelectedDevice = ({ device, onClose }) => {
  const t = useTranslation();
  const dispatch = useDispatch();

  const [model, setModel] = useState(device?.model || '');
  const [plate, setPlate] = useState(device?.attributes?.plate || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = useCatch(async () => {
    setLoading(true);
    const updatedDevice = {
      ...device,
      model: model,
      attributes: {
        ...device.attributes,
        model: model,
        plate: plate,
      },
    };

    const response = await fetch(`/api/devices/${device.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedDevice),
    });

    if (response.ok) {
      const saved = await response.json();
      dispatch(devicesActions.update([saved]));
      setIsEditing(false);
    }
    setLoading(false);
  });

  return (
    <Box sx={{ padding: '8px 12px', minWidth: '240px' }}>
      {!isEditing ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }} onClick={() => setIsEditing(true)}>
            <Typography variant="subtitle2" fontWeight="bold">{model || 'Sem Modelo'}</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1e3a8a' }}>
              {plate || 'SEM PLACA'}
            </Typography>
          </Box>
          <IconButton size="small" color="primary" onClick={() => setIsEditing(true)} title="Editar dados">
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Typography variant="caption" fontWeight="bold">{t('sharedEdit')}</Typography>
          <TextField
            label={t('deviceModel')}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label={t('devicePlate')}
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            size="small"
            fullWidth
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
            <Button onClick={() => setIsEditing(false)} size="small" variant="outlined">{t('sharedCancel')}</Button>
            <Button onClick={handleSave} size="small" variant="contained" disabled={loading}>{t('sharedSave')}</Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default MapSelectedDevice;
