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
      // Monta o objeto atualizado garantindo que model e attributes.plate estejam nivelados
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
      
      // Garante que o objeto retornado do servidor contenha os dados atualizados explicitamente
      const finalDevice = {
        ...saved,
        model: localModel,
        attributes: {
          ...(saved.attributes || {}),
          plate: localPlate,
        },
        _t: Date.now(), // Força nova referência para o Redux disparar re-render
      };

      // Atualiza o Redux e o estado local
      dispatch(devicesActions.update([finalDevice]));
      dispatch(devicesActions.refresh({ [finalDevice.id]: finalDevice }));
      
      // Busca a lista completa de dispositivos para sincronizar admin e usuário
      const listRes = await fetch('/api/devices', { credentials: 'same-origin' });
      if (listRes.ok) {
        const allDevices = await listRes.json();
        const refreshedMap = {};
        allDevices.forEach((d) => {
          if (d.id === finalDevice.id) {
            refreshedMap[d.id] = finalDevice; // Garante prioridade ao dado recém editado
          } else {
            refreshedMap[d.id] = d;
          }
        });
        dispatch(devicesActions.refresh(refreshedMap));
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
