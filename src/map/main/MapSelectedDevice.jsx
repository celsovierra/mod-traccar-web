import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useMediaQuery, Button, TextField, Typography, Box } from '@mui/material';
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
      if (onClose && !isEditing) onClose();
    }
    setLoading(false);
  });

  return (
    <Box sx={{ padding: '12px', minWidth: '260px' }}>
      {!isEditing ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">{model || 'Sem Modelo'}</Typography>
          {/* Clicar na placa ativa o modo de edição */}
          <Box 
            onClick={() => setIsEditing(true)} 
            sx={{ cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.03)' } }}
            title="Clique para editar"
          >
            <div style={{
              border: '2px solid #1e3a8a',
              borderRadius: '6px',
              padding: '4px 12px',
              backgroundColor: '#fff',
              textAlign: 'center',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              fontSize: '18px',
              letterSpacing: '2px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {plate || 'SEM PLACA'}
            </div>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Typography variant="h6" fontSize="16px">{t('sharedEdit')}</Typography>
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
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '8px' }}>
            <Button onClick={() => setIsEditing(false)} size="small" variant="outlined">{t('sharedCancel')}</Button>
            <Button onClick={handleSave} size="small" variant="contained" disabled={loading}>{t('sharedSave')}</Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default MapSelectedDevice;
