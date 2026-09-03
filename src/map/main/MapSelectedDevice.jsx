import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Button, TextField, Typography, Box } from '@mui/material';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { devicesActions } from '../../store';
import { useCatch } from '../../reactHelper';

const MapSelectedDevice = ({ device, onClose }) => {
  const t = useTranslation();
  const dispatch = useDispatch();

  const [model, setModel] = useState(device?.model || '');
  const [plate, setPlate] = useState(device?.attributes?.plate || '');
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
      if (onClose) onClose();
    }
    setLoading(false);
  });

  return (
    <Box sx={{ padding: '16px', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Typography variant="h6">{t('sharedEdit')}</Typography>
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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
        <Button onClick={onClose} size="small" variant="outlined">{t('sharedCancel')}</Button>
        <Button onClick={handleSave} size="small" variant="contained" disabled={loading}>{t('sharedSave')}</Button>
      </Box>
    </Box>
  );
};

export default MapSelectedDevice;
