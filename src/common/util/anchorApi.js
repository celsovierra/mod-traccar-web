import { setLocalAnchor, getLocalAnchor } from './anchorStore';

export const ANCHOR_RADIUS = 50;
const prefix = 'ANCORA_';

export const anchorName = (device) => `${prefix}${device.name}_${device.id}`;

const jsonHeaders = { 'Content-Type': 'application/json', Accept: 'application/json' };

const tryServer = async (fn) => {
  try {
    const res = await fn();
    if (res.status === 401 || res.status === 403) return { ok: false, denied: true };
    if (!res.ok) return { ok: false, denied: false };
    const text = await res.text();
    return { ok: true, data: text ? JSON.parse(text) : null };
  } catch {
    return { ok: false, denied: false };
  }
};

export const findAnchorGeofence = async (device) => {
  const local = getLocalAnchor(device.id);
  if (local) return { id: local.geofenceId };

  const res = await tryServer(() => fetch(`/api/geofences?deviceId=${device.id}`));
  if (!res.ok || !res.data) return null;
  return res.data.find((g) => g.name === anchorName(device))
      || res.data.find((g) => g.name.startsWith(prefix)) || null;
};

export const createAnchor = async (device, position) => {
  const anchorData = {
    active: true,
    lat: position.latitude,
    lon: position.longitude,
    radius: ANCHOR_RADIUS,
    createdAt: Date.now(),
    geofenceId: null,
  };

  const gf = await tryServer(() => fetch('/api/geofences', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      name: anchorName(device),
      description: 'Ancora virtual GUIMOD (50m)',
      area: `CIRCLE (${position.latitude} ${position.longitude}, ${ANCHOR_RADIUS})`,
      calendarId: 0,
      attributes: { anchor: true, deviceId: device.id },
    }),
  }));

  if (gf.ok && gf.data?.id) {
    anchorData.geofenceId = gf.data.id;
    await tryServer(() => fetch('/api/permissions', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ deviceId: device.id, geofenceId: gf.data.id }),
    }));
    await tryServer(() => saveDeviceAttributes(device, {
      anchorActive: true,
      anchorLat: position.latitude,
      anchorLon: position.longitude,
      anchorGeofenceId: gf.data.id,
    }));
  }

  setLocalAnchor(device.id, anchorData);
  return { id: anchorData.geofenceId };
};

export const removeAnchor = async (device) => {
  const local = getLocalAnchor(device.id);
  const id = local?.geofenceId || device.attributes?.anchorGeofenceId;

  if (id) {
    await tryServer(() => fetch('/api/permissions', {
      method: 'DELETE', headers: jsonHeaders,
      body: JSON.stringify({ deviceId: device.id, geofenceId: id }),
    }));
    await tryServer(() => fetch(`/api/geofences/${id}`, { method: 'DELETE' }));
  }

  await tryServer(() => saveDeviceAttributes(device, {
    anchorActive: false, anchorLat: null, anchorLon: null, anchorGeofenceId: null,
  }));

  setLocalAnchor(device.id, null);
};

export const saveDeviceAttributes = async (device, patch) => {
  const attributes = { ...(device.attributes || {}) };
  Object.entries(patch).forEach(([k, v]) => {
    if (v === null) delete attributes[k]; else attributes[k] = v;
  });
  const res = await tryServer(() => fetch(`/api/devices/${device.id}`, {
    method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ ...device, attributes }),
  }));
  return res.ok;
};

export const createAnchorGeofence = async (name, lat, lon, radius) => {
  const res = await tryServer(() => fetch('/api/geofences', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name, area: `CIRCLE (${lat} ${lon}, ${radius || ANCHOR_RADIUS})`, attributes: {} }),
  }));
  return res.ok ? res.data?.id : null;
};

export const linkGeofence = async (deviceId, geofenceId) => {
  await tryServer(() => fetch('/api/permissions', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ deviceId, geofenceId }),
  }));
};

export const deleteGeofence = async (geofenceId) => {
  if (geofenceId) {
    await tryServer(() => fetch(`/api/geofences/${geofenceId}`, { method: 'DELETE' }));
  }
};

export const sendCommand = async (deviceId, type) => {
  await tryServer(() => fetch('/api/commands/send', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ deviceId, type, attributes: {} }),
  }));
};

export const distanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

export const resolveAnchor = (device) => {
  const local = getLocalAnchor(device?.id);
  if (local?.active) return local;
  const a = device?.attributes;
  if (a?.anchorActive && a?.anchorLat != null && a?.anchorLon != null) {
    return { active: true, lat: a.anchorLat, lon: a.anchorLon, radius: ANCHOR_RADIUS, geofenceId: a.anchorGeofenceId ?? null };
  }
  return null;
};
