import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { devicesActions } from '../../store';

export const useDeviceEdit = (item, setItem) => {
  const dispatch = useDispatch();
  const [localPlate, setLocalPlate] = useState('');
  const [localModel, setLocalModel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setLocalPlate(item.attributes?.plate || '');
      setLocalModel(item.model || '');
    }
  }, [item?.id]);

  const saveDeviceEdits = async (additionalData = {}) => {
    if (!item || !item.id) return false;
    setSaving(true);

    try {
      const updatedDevice = {
        ...item,
        ...additionalData,
        model: localModel,
        attributes: {
          ...(item.attributes || {}),
          plate: localPlate,
        },
      };

      const response = await fetch(`/api/devices/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(updatedDevice),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar dispositivo');
      }

      const saved = await response.json();
      dispatch(devicesActions.update([saved]));
      setItem(saved);
      setSaving(false);
      return true;
    } catch (error) {
      console.error('Erro ao editar veículo:', error);
      setSaving(false);
      return false;
    }
  };

  return {
    localPlate,
    setLocalPlate,
    localModel,
    setLocalModel,
    saveDeviceEdits,
    saving,
  };
};
