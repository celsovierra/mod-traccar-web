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
      // Monta o payload completo combinando o item atual com as alterações de modelo e placa
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
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(updatedDevice),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao salvar dispositivo: ${errorText}`);
      }

      const saved = await response.json();
      
      const finalDevice = {
        ...saved,
        model: localModel,
        attributes: {
          ...(saved.attributes || {}),
          plate: localPlate,
        },
      };

      // Atualiza o Redux buscando a lista fresca diretamente da API para garantir consistência
      const listRes = await fetch('/api/devices', { credentials: 'same-origin' });
      if (listRes.ok) {
        const allDevices = await listRes.json();
        const refreshedMap = {};
        allDevices.forEach((d) => {
          refreshedMap[d.id] = (d.id === finalDevice.id) ? finalDevice : d;
        });
        dispatch(devicesActions.refresh(refreshedMap));
      } else {
        dispatch(devicesActions.update([finalDevice]));
      }

      if (setItem) setItem(finalDevice);
      window.dispatchEvent(new CustomEvent('deviceDataUpdated', { detail: finalDevice }));
      
      setSaving(false);
      return true;
    } catch (error) {
      console.error('Erro no módulo deviceEdit:', error);
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
