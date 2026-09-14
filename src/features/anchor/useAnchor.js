import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { geofencesActions } from '../../store';

const ANCHOR_RADIUS = 100;
const prefix = (deviceId) => `ANCORA_${deviceId}`;
const isAnchorOf = (g, deviceId) => new RegExp('^ANCORA_' + Number(deviceId) + '($|[^0-9])').test(String(g?.name || ''));

export const useAnchor = (deviceId) => {
  const dispatch = useDispatch();
  const [loadingAnchor, setLoadingAnchor] = useState(false);
  const [isAnchorActive, setIsAnchorActive] = useState(false);

  const device = useSelector((state) => state.devices.items[deviceId]);
  const user = useSelector((state) => state.session.user);
  const geofences = useSelector((state) => state.geofences.items);
  const position = useSelector((state) => Object.values(state.session.positions || {}).find((p) => p.deviceId === Number(deviceId)));

  const isAdmin = user?.administrator || user?.admin;

  useEffect(() => {
    if (!loadingAnchor) setIsAnchorActive(Object.values(geofences || {}).some((g) => isAnchorOf(g, deviceId)));
  }, [geofences, deviceId, loadingAnchor]);

  const reload = useCallback(async () => {
    const res = await fetch(isAdmin ? '/api/geofences?all=true' : '/api/geofences');
    if (res.ok) dispatch(geofencesActions.refresh(await res.json()));
  }, [dispatch, isAdmin]);

  const link = async (body) => fetch('/api/permissions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body:JSON.stringify(body),
  }).catch(() => {});

  const toggleAnchor = useCallback(async () => {
    setLoadingAnchor(true);
    const willActivate = !isAnchorActive;
    const emit = (active) => window.dispatchEvent(new CustomEvent('anchor-local', { detail: { deviceId: Number(deviceId), active, latitude: position?.latitude, longitude: position?.longitude, radius: ANCHOR_RADIUS } }));
    emit(willActivate); setIsAnchorActive(willActivate);

    try {
      if (!isAdmin) {
        // Usuario comum: usa o proxy que verifica permissao e grava direto no banco
        if (willActivate) {
          if (!position) { setIsAnchorActive(false); emit(false); window.alert('Sem posicao atual do veiculo'); return; }
          const res = await fetch(`/api-anchor/${deviceId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: position.latitude,
              longitude: position.longitude,
              radius: ANCHOR_RADIUS,
              deviceName: device?.name || 'Veiculo',
            }),
          });
          if (!res.ok) { setIsAnchorActive(false); emit(false); window.alert('Falha ao criar ancora: ' + (res.status + ' ' + await res.text())); return; }
        } else {
          const res = await fetch(`/api-anchor/${deviceId}`, { method: 'DELETE' });
          if (!res.ok) { setIsAnchorActive(true); emit(true); window.alert('Falha ao excluir ancora: ' + (res.status + ' ' + await res.text())); return; }
        }
        await reload();
        return;
      }

      const listRes = await fetch(isAdmin ? '/api/geofences?all=true' : '/api/geofences');
      const list = listRes.ok ? await listRes.json() : [];
      const existing = list.filter((g) => isAnchorOf(g, deviceId));

      if (existing.length) {
        const dels = await Promise.all(existing.map((g) => fetch('/api/geofences/' + g.id, { method: 'DELETE' })));
        const bad = dels.find((r) => !r.ok); if (!bad) { const r2 = await fetch(isAdmin ? '/api/geofences?all=true' : '/api/geofences'); const rest = r2.ok ? (await r2.json()).filter((g) => isAnchorOf(g, deviceId)) : []; await Promise.all(rest.map((g) => fetch('/api/geofences/' + g.id, { method: 'DELETE' }))); }
        if (bad) { setIsAnchorActive(true); emit(true); window.alert('Falha ao excluir ancora: ' + bad.status + ' ' + (await bad.text())); return; }
      } else {
        if (!position) { setIsAnchorActive(false); emit(false); window.alert('Sem posicao atual do veiculo'); return; }
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
        if (!res.ok) { setIsAnchorActive(false); emit(false); window.alert('Falha ao criar ancora: ' + (res.status + ' ' + await res.text())); return; }
        const geofence = await res.json();

        await link({ deviceId: Number(deviceId), geofenceId: geofence.id });
        if (user?.id && !user.administrator) await link({ userId: user.id,geofenceId: geofence.id });

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
  }, [deviceId, device, position, user, reload, isAnchorActive, isAdmin]);

  return { isAnchorActive, toggleAnchor, loadingAnchor };
};
