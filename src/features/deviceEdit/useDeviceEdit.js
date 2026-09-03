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
      
      const finalDevice = {
        ...saved,
        model: localModel,
        attributes: {
          ...(saved.attributes || {}),
          plate: localPlate,
        },
      };

      // Busca a lista atualizada de dispositivos do servidor para garantir sincronia total no Redux
      const listRes = await fetch('/api/devices', { credentials: 'same-origin' });
      if (listRes.ok) {
        const allDevices = await listRes.json();
        // Substitui o device alterado na lista fresca
        const updatedList = allDevices.map(d => d.id === finalDevice.id ? finalDevice : d);
        
        // Atualiza o estado global do Redux com a nova lista/mapa
        dispatch(devicesActions.refresh(
          updatedList.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})
        ));
      }

      setItem(finalDevice);
      window.dispatchEvent(new CustomEvent('deviceUpdate', { detail: finalDevice }));
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
