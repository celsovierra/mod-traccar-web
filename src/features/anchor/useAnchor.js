import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { devicesActions } from '../../store';

export const useAnchor = (deviceId, device, position) => {
  const dispatch = useDispatch();
  const [loadingAnchor, setLoadingAnchor] = useState(false);
  
  const checkIsActive = () => {
    if (!deviceId) return false;
    const localAnchor = localStorage.getItem(`device_anchor_${deviceId}`);
    
    // Se explicitamente marcado como 'false' no localStorage, respeita imediatamente
    if (localAnchor === 'false') return false;
    if (localAnchor && localAnchor !== 'false') return true;

    // Caso contrário, olha os atributos do device
    const attrAnchor = device?.attributes?.anchor;
    if (attrAnchor && typeof attrAnchor === 'object' && attrAnchor.active !== false) {
      return true;
    }

    return false;
  };

  const [isAnchorActive, setIsAnchorActive] = useState(checkIsActive);

  useEffect(() => {
    const localAnchor = localStorage.getItem(`device_anchor_${deviceId}`);
    if (localAnchor === 'false') {
      setIsAnchorActive(false);
    } else {
      setIsAnchorActive(checkIsActive());
    }
  }, [deviceId, device]);

  const toggleAnchor = async () => {
    if (loadingAnchor) return;
    setLoadingAnchor(true);

    try {
      if (isAnchorActive) {
        // Desativar âncora instantaneamente
        localStorage.setItem(`device_anchor_${deviceId}`, 'false');
        setIsAnchorActive(false);

        if (device) {
          const updatedAttributes = { ...device.attributes };
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
        // Ativar âncora instantaneamente
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
              ...device.attributes,
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
