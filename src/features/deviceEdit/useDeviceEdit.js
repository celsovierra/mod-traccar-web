import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { devicesActions, sessionActions } from '../../store';

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
      
      const finalDevice = {
        ...saved,
        model: localModel,
        attributes: {
          ...(saved.attributes || {}),
          plate: localPlate,
        },
        _updatedAt: Date.now(),
      };

      // 1. Atualiza diretamente via dispatch de devicesActions
      dispatch(devicesActions.update([finalDevice]));

      // 2. Busca nova lista do servidor e injeta no store para garantir sincronia absoluta
      const listRes = await fetch('/api/devices', { credentials: 'same-origin' });
      if (listRes.ok) {
        const allDevices = await listRes.json();
        const devicesMap = {};
        allDevices.forEach((d) => {
          if (d.id === finalDevice.id) {
            devicesMap[d.id] = finalDevice;
          } else {
            devicesMap[d.id] = d;
          }
        });
        dispatch(devicesActions.refresh(devicesMap));
      }

      setItem(finalDevice);
      
      // 3. Dispara evento global para forçar qualquer componente escutando a atualizar
      window.dispatchEvent(new CustomEvent('deviceDataUpdated', { detail: finalDevice }));

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
