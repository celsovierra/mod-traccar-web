import { useEffect, useRef } from 'react';
import { distanceMeters, resolveAnchor } from './anchorApi';

export default (device, position, onBreach) => {
  const fired = useRef(false);

  useEffect(() => {
    if (!device) return;
    const anchor = resolveAnchor(device);
    if (!anchor || !position) { fired.current = false; return; }

    const d = distanceMeters(anchor.lat, anchor.lon, position.latitude, position.longitude);
    if (d > anchor.radius + 5 && !fired.current) {
      fired.current = true;
      onBreach?.(d);
    }
    if (d < anchor.radius) fired.current = false;
  }, [device, position, onBreach]);
};
