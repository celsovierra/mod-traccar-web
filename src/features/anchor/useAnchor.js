import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { geofencesActions } from '../../store';

const ANCHOR_RADIUS = 100;
const prefix = (deviceId) => `ANCORA_${deviceId}`;
const isAnchorOf = (g, deviceId) => g?.name === prefix(deviceId) || g?.name?.startsWith(`${prefix(deviceId)} - `);

export const useAnchor = (deviceId) => {
  const dispatch = useDispatch();
  const [loadingAnchor, setLoadingAnchor] = useState(false);
  const [isAnchorActive, setIsAnchorActive] = useState(false);

  const device = useSelector((state) => state.devices.items[deviceId]);
  const user = useSelector((state) => state.session.user);
  const geofences = useSelector((state) => state.geofences.items);
  const position = useSelector((state) => Object.values(state.session.positions || {}).find((p) => p.deviceId === Number(deviceId)));

  useEffect(() => {
    setIsAnchorActive(Object.values(geofences || {}).some((g) => isAnchorOf(g, deviceId)));
  }, [geofences, deviceId]);

  const reload = useCallback(async () => {
    const res = await fetch('/api/geofences');
    if (res.ok) dispatch(geofencesActions.refresh(await res.json()));
  }, [dispatch]);

  const link = async (body) => fetch('/api/permissions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).catch(() => {});

  const toggleAnchor = useCallback(async () => {
    setLoadingAnchor(true);
    try {
      const listRes = await fetch('/api/geofences');
      const list = listRes.ok ? await listRes.json() : [];
      const existing = list.filter((g) => isAnchorOf(g, deviceId));

      if (existing.length) {
        await Promise.all(existing.map((g) => fetch(`/api/geofences/${g.id}`, { method: 'DELETE' })));
      } else {
        if (!position) { window.alert('Sem posicao atual do veiculo para criar a ancora.'); return; }
        const res = await fetch('/api/geofences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${prefix(deviceId)} - ${device?.name || 'Veiculo'}`,
            description: 'Ancora automatica',
            area: `CIRCLE (${position.latitude} ${position.longitude}, ${ANCHOR_RADIUS})`,
            attributes: {},
          }),
        });
        if (!res.ok) { window.alert('Falha ao criar ancora: ' + (await res.text())); return; }
        const geofence = await res.json();

        await link({ deviceId: Number(deviceId), geofenceId: geofence.id });
        if (user?.id && !user.administrator) await link({ userId: user.id, geofenceId: geofence.id });

        const usersRes = await fetch(`/api/users?deviceId=${Number(deviceId)}`).catch(() => null);
        if (usersRes && usersRes.ok) {
          const users = await usersRes.json();
          await Promise.all(users.map((u) => link({ userId: u.id, geofenceId: geofence.id })));
        }
      }
      await reload();
    } finally {
      setLoadingAnchor(false);
    }
  }, [deviceId, device, position, user, reload]);

  return { isAnchorActive, toggleAnchor, loadingAnchor };
};


