import { useEffect } from 'react';
import { useSelector } from 'react-redux';

const isAnchorOf = (g, id) => new RegExp('^ANCORA_' + Number(id) + '($|[^0-9])').test(String(g?.name || ''));

const AnchorAdminSync = () => {
  const user = useSelector((state) => state.session.user);
  const isAdmin = !!(user?.administrator || user?.admin);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let stopped = false;

    const link = (body) => fetch('/api/permissions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).catch(() => {});

    const sync = async () => {
      try {
        const [dRes, gRes] = await Promise.all([fetch('/api/devices?all=true'), fetch('/api/geofences?all=true')]);
        if (!dRes.ok || !gRes.ok) return;
        const devices = await dRes.json();
        const geofences = await gRes.json();

        for (const dev of devices) {
          const req = dev?.attributes?.anchorRequest;
          const existing = geofences.filter((g) => isAnchorOf(g, dev.id));

          if (req && !existing.length && req.latitude && req.longitude) {
            const res = await fetch('/api/geofences', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: `ANCORA_${dev.id} - ${dev.name || 'Veiculo'}`,
                description: 'Ancora automatica',
                area: `CIRCLE (${req.latitude} ${req.longitude}, ${req.radius || 100})`,
                attributes: {},
              }),
            });
            if (res.ok) {
              const geofence = await res.json();
              await link({ deviceId: Number(dev.id), geofenceId: geofence.id });
              const uRes = await fetch(`/api/users?deviceId=${Number(dev.id)}`).catch(() => null);
              if (uRes && uRes.ok) {
                const users = await uRes.json();
                await Promise.all(users.map((u) => link({ userId: u.id, geofenceId: geofence.id })));
              }
            }
          }

          if (!req && existing.length) {
            await Promise.all(existing.map((g) => fetch('/api/geofences/' + g.id, { method: 'DELETE' })));
          }
        }
      } catch (e) { /* ignora */ }
    };

    sync();
    const timer = setInterval(() => { if (!stopped) sync(); }, 4000);
    return () => { stopped = true; clearInterval(timer); };
  }, [isAdmin]);

  return null;
};

export default AnchorAdminSync;
