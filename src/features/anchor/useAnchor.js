import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { geofencesActions } from '../../store';

const ANCHOR_RADIUS = 100;

const anchorPrefix = (deviceId) => `ANCORA_${deviceId}`;
const isAnchorOf = (g, deviceId) => g?.name === anchorPrefix(deviceId) || g?.name?.startsWith(`${anchorPrefix(deviceId)} - `);

export const useAnchor = (deviceId) => {
  const dispatch = useDispatch();
  const [loadingAnchor, setLoadingAnchor] = useState(false);

  const device = useSelector((state) => state.devices.items[deviceId]);
  const user = useSelector((state) => state.session.user);
  const geofences = useSelector((state) => state.geofences.items);
  const position = useSelector((state) => Object.values(state.session.positions || {}).find((p) => p.deviceId === Number(deviceId)));

  const [isAnchorActive, setIsAnchorActive] = useState(false);

  useEffect(() => {
    setIsAnchorActive(Object.values(geofences || {}).some((g) => isAnchorOf(g, deviceId)));
  }, [geofences, deviceId]);

  const reloadGeofences = useCallback(async () => {
    const res = await fetch('/api/geofences');
    if (res.ok) dispatch(geofencesActions.refresh(await res.json()));
  }, [dispatch]);

  const toggleAnchor = useCallback(async () => {
    setLoadingAnchor(true);
    try {
      const listRes = await fetch('/api/geofences');
      const list = listRes.ok ? await listRes.json() : [];
      const existing = list.filter((g) => isAnchorOf(g, deviceId));

      if (existing.length) {
        await Promise.all(existing.map((g) => fetch(`/api/geofences/${g.id}`, { method: 'DELETE' })));
      } else {
        if (!position) {
          window.alert('Sem posicao atual do veiculo para criar a ancora.');
          return;
        }
        const geoRes = await fetch('/api/geofences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${anchorPrefix(deviceId)} - ${device?.name || 'Veiculo'}`,
            description: 'Ancora automatica',
            area: `CIRCLE (${position.latitude} ${position.longitude}, ${ANCHOR_RADIUS})`,
            attributes: {},
          }),
        });
        if (!geoRes.ok) {
          window.alert('Falha ao criar ancora: ' + (await geoRes.text()));
          return;
        }
        const geofence = await geoRes.json();

        await fetch('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: Number(deviceId), geofenceId: geofence.id }),
        });
        if (user?.id) {
          await fetch('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, geofenceId: geofence.id }),
          });
        }
      }
      await reloadGeofences();
    } finally {
      setLoadingAnchor(false);
    }
  }, [deviceId, device, position, user, reloadGeofences]);

  return { isAnchorActive, toggleAnchor, loadingAnchor };
};
