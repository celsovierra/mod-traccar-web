import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { devicesActions } from '../../store';

export const useAnchor = (deviceId, device, position) => {
  const dispatch = useDispatch();
  const [loadingAnchor, setLoadingAnchor] = useState(false);
  
  const [isAnchorActive, setIsAnchorActive] = useState(() => {
    const attrAnchor = device?.attributes?.anchor;
    const localAnchor = localStorage.getItem(`device_anchor_${deviceId}`);
    return Boolean(attrAnchor || localAnchor);
  });

  useEffect(() => {
    const attrAnchor = device?.attributes?.anchor;
    const localAnchor = localStorage.getItem(`device_anchor_${deviceId}`);
    setIsAnchorActive(Boolean(attrAnchor || localAnchor));
  }, [deviceId, device]);

  const toggleAnchor = async () => {
    if (loadingAnchor) return;
    setLoadingAnchor(true);

    try {
      if (isAnchorActive) {
        localStorage.removeItem(`device_anchor_${deviceId}`);
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
        setIsAnchorActive(false);
        window.dispatchEvent(new CustomEvent('anchorUpdate'));
      } else if (position) {
        const anchorData = {
          deviceId: Number(deviceId),
          latitude: position.latitude,
          longitude: position.longitude,
          radius: 50,
          active: true,
        };
        localStorage.setItem(`device_anchor_${deviceId}`, JSON.stringify(anchorData));
        
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
        setIsAnchorActive(true);
        window.dispatchEvent(new CustomEvent('anchorUpdate'));
      }
    } finally {
      setLoadingAnchor(false);
    }
  };

  return { isAnchorActive, toggleAnchor, loadingAnchor };
};
