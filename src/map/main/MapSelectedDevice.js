import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useMediaQuery, Button, TextField, Typography } from '@mui/material';
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
      // Atualiza o store do Redux imediatamente para refletir no card e no mapa
      dispatch(devicesActions.update([saved]));
      if (onClose) onClose();
    }
    setLoading(false);
  });

  return (
    <div style={{ padding: '16px', minWidth: '280px' }}>
      <Typography variant="h6" gutterBottom>{t('sharedEdit')}</Typography>
      <TextField
        label={t('deviceModel')}
        value={model}
        onChange={(e) => setModel(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label={t('devicePlate')}
        value={plate}
        onChange={(e) => setPlate(e.target.value)}
        fullWidth
        margin="normal"
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
        <Button onClick={onClose} variant="outlined">{t('sharedCancel')}</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>{t('sharedSave')}</Button>
      </div>
    </div>
  );
};

export default MapSelectedDevice;
