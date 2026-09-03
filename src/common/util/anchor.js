export const ANCHOR_RADIUS = 50;       // metros
export const ANCHOR_TOLERANCE = 55;    // histerese p/ evitar jitter do GPS

export const distanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180)
      * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const anchorGeofenceName = (device, userEmail) =>
  `ANCORA_${device.name}_${device.id}_${userEmail || 'user'}`;

export const readAnchor = (device) => {
  const a = device?.attributes || {};
  const active = a.anchorActive === true;
  return {
    active,
    latitude: active ? Number(a.anchorLat) : null,
    longitude: active ? Number(a.anchorLon) : null,
    geofenceId: active ? a.anchorGeofenceId ?? null : null,
  };
};
