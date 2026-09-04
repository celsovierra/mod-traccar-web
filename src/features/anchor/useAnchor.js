import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { devicesActions } from '../../store';

export const useAnchor = (deviceId, device, position) => {
  const dispatch = useDispatch();
  const [loadingAnchor, setLoadingAnchor] = useState(false);
  
  const checkIsActive = () => {
    if (!deviceId) return false;
    const localState = localStorage.getItem(\device_anchor_state_\\);
    
    if (localState === 'inactive') return false;
    if (localState === 'active') return true;

    const localAnchor = localStorage.getItem(\device_anchor_\\);
    if (localAnchor === 'false' || !localAnchor) {
      return false;
    }

    return true;
  };

  const [isAnchorActive, setIsAnchorActive] = useState(checkIsActive);

  useEffect(() => {
    setIsAnchorActive(checkIsActive());
  }, [deviceId, device]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (deviceId && e.key === \device_anchor_state_\\) {
        if (e.newValue === 'active') {
          setIsAnchorActive(true);
        } else if (e.newValue === 'inactive') {
          setIsAnchorActive(false);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [deviceId]);

  const toggleAnchor = async () => {
    if (loadingAnchor) return;
    setLoadingAnchor(true);

    try {
      if (isAnchorActive) {
        localStorage.setItem(\device_anchor_state_\\, 'inactive');
        localStorage.removeItem(\device_anchor_\\);
        setIsAnchorActive(false);

        if (device) {
          const updatedAttributes = { ...(device.attributes || {}) };
          delete updatedAttributes.anchor;
          const updatedDevice = { ...device, attributes: updatedAttributes };
          dispatch(devicesActions.update([updatedDevice]));
          await fetch(\/api/devices/\\, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(updatedDevice),
          }).catch(() => {});
        }
        window.dispatchEvent(new CustomEvent('anchorUpdate'));
      } else if (position) {
        localStorage.setItem(\device_anchor_state_\\, 'active');
        const anchorData = {
          deviceId: Number(deviceId),
          latitude: position.latitude,
          longitude: position.longitude,
          radius: 50,
          active: true,
        };
        localStorage.setItem(\device_anchor_\\, JSON.stringify(anchorData));
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
          await fetch(\/api/devices/\\, {
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