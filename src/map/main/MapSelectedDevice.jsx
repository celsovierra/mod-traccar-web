import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, TextField, Typography, Box } from '@mui/material';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { devicesActions } from '../../store';
import { useCatch } from '../../reactHelper';
import { getStoppedTimeStatus, StoppedTimeDisplay } from '../../features/stoppedTime';

const MapSelectedDevice = ({ device, onClose }) => {
  const t = useTranslation();
  const dispatch = useDispatch();

  const position = useSelector((state) => state.session.positions[device?.id]);
  const stoppedStatus = position ? getStoppedTimeStatus(device?.id, position) : null;

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
    <Box sx={{ minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {!isEditing ? (
        <>
          <Box 
            onClick={() => setIsEditing(true)} 
            sx={{ cursor: 'pointer', display: 'inline-block', '&:hover': { opacity: 0.85 } }}
            title="Clique para editar"
          >
            <div style={{
              border: '2px solid #1e3a8a',
              borderRadius: '6px',
              padding: '2px 10px',
              backgroundColor: '#fff',
              textAlign: 'center',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              fontSize: '16px',
              letterSpacing: '1px',
              display: 'inline-block'
            }}>
              {plate || 'SEM PLACA'}
            </div>
          </Box>
          <Box sx={{ mt: '2px' }}>
            <StoppedTimeDisplay stoppedSince={stoppedStatus?.stoppedSince} />
          </Box>
        </>
      ) : (
        <Box sx={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Typography variant="subtitle2" fontWeight="bold">{t('sharedEdit')}</Typography>
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
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
            <Button onClick={() => setIsEditing(false)} size="small" variant="outlined">{t('sharedCancel')}</Button>
            <Button onClick={handleSave} size="small" variant="contained" disabled={loading}>{t('sharedSave')}</Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default MapSelectedDevice;