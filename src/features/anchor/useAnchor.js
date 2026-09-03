import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { devicesActions } from '../../store';

export const useAnchor = (deviceId, device, position) => {
  const dispatch = useDispatch();
  const [loadingAnchor, setLoadingAnchor] = useState(false);
  
  const checkIsActive = () => {
    if (!deviceId) return false;
    const localState = localStorage.getItem(`device_anchor_state_${deviceId}`);
    
    // Se o usuário marcou explicitamente como desativado, retorna false sem olhar o servidor
    if (localState === 'inactive') return false;
    if (localState === 'active') return true;

    // Fallback caso não tenha o state explícito
    const localAnchor = localStorage.getItem(`device_anchor_${deviceId}`);
    if (localAnchor === 'false' || !localAnchor) {
      return false;
    }

    return true;
  };

  const [isAnchorActive, setIsAnchorActive] = useState(checkIsActive);

  useEffect(() => {
    setIsAnchorActive(checkIsActive());
  }, [deviceId, device]);

  const toggleAnchor = async () => {
    if (loadingAnchor) return;
    setLoadingAnchor(true);

    try {
      if (isAnchorActive) {
        // Desativar: marca explicitamente como inactive no localStorage
        localStorage.setItem(`device_anchor_state_${deviceId}`, 'inactive');
        localStorage.removeItem(`device_anchor_${deviceId}`);
        setIsAnchorActive(false);

        if (device) {
          const updatedAttributes = { ...(device.attributes || {}) };
          delete updatedAttributes.anchor;
          const updatedDevice = { ...device, attributes: updatedAttributes };
          dispatch(devicesActions.update([updatedDevice]));
          await fetch(`/api/devices/${deviceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(updatedDevice),
          }).catch(() => {});
        }
        window.dispatchEvent(new CustomEvent('anchorUpdate'));
      } else if (position) {
        // Ativar: marca explicitamente como active e salva os dados
        localStorage.setItem(`device_anchor_state_${deviceId}`, 'active');
        const anchorData = {
          deviceId: Number(deviceId),
          latitude: position.latitude,
          longitude: position.longitude,
          radius: 50,
          active: true,
        };
        localStorage.setItem(`device_anchor_${deviceId}`, JSON.stringify(anchorData));
        setIsAnchorActive(true);
        
        if (device) {
          const updatedDevice = {
            ...device,
            attributes: {
              ...(device.attributes || {}),
              anchor: anchorData,
            },
          };
          dispatch(devicesActions.update([updatedDevice]));
          await fetch(`/api/devices/${deviceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(updatedDevice),
          }).catch(() => {});
        }
        window.dispatchEvent(new CustomEvent('anchorUpdate'));
      }
    } finally {
      setLoadingAnchor(false);
    }
  };

  return { isAnchorActive, toggleAnchor, loadingAnchor };
};
