import { useState, useEffect, useCallback } from 'react';
import { getAnchor, saveAnchor } from '../util/anchorStore';

export const useAnchor = (deviceId) => {
  const [anchor, setAnchor] = useState(() => getAnchor(deviceId) || { active: false });

  useEffect(() => {
    const saved = getAnchor(deviceId);
    setAnchor(saved || { active: false });
  }, [deviceId]);

  const activate = useCallback((lat, lon, radius = 50, geofenceId = null) => {
    const value = { active: true, lat, lon, radius, geofenceId };
    saveAnchor(deviceId, value);
    setAnchor(value);
  }, [deviceId]);

  const deactivate = useCallback(() => {
    saveAnchor(deviceId, null);
    setAnchor({ active: false });
  }, [deviceId]);

  return { anchor: anchor || { active: false }, activate, deactivate };
};

export default useAnchor;
