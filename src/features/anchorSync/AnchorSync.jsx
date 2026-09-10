import { useEffect } from 'react';
import { useSelector } from 'react-redux';

// Modulo isolado: nao altera nenhuma regra existente da ancora.
// Usuario comum -> grava o pedido no veiculo.
// Administrador -> ve o pedido e cria/apaga a ancora no banco.

const isAnchorOf = (g, id) => new RegExp('^ANCORA_' + Number(id) + '($|[^0-9])').test(String(g?.name || ''));
const link = (body) => fetch('/api/permissions', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}).catch(() => {});

const AnchorSync = () => {
  const user = useSelector((state) => state.session.user);
  const isAdmin = !!(user?.administrator || user?.admin);

  // Lado do usuario comum: registra o pedido no proprio veiculo
  useEffect(() => {
    if (isAdmin) return undefined;
    const onLocal = async (e) => {
      const { deviceId, active, latitude, longitude, radius } = e.detail || {};
      if (!deviceId) return;
      try {
        const r = await fetch('/api/devices/' + Number(deviceId));
        if (!r.ok) return;
        const dev = await r.json();
        const attributes = { ...(dev.attributes || {}) };
        if (active) attributes.anchorRequest = { latitude, longitude, radius: radius || 100, ts: Date.now() };
        else delete attributes.anchorRequest;
        const pr = await fetch('/api/devices/' + Number(deviceId), {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...dev, attributes }),
        });
      } catch (err) { /* ignora */ }
    };
    window.addEventListener('anchor-local', onLocal);
    return () => window.removeEventListener('anchor-local', onLocal);
  }, [isAdmin]);

  // Lado do administrador: atende os pedidos criando/apagando no banco
  useEffect(() => {
    if (!isAdmin) return undefined;
    let stopped = false;
    const handled = new Set();

    const sync = async () => {
      try {
        const [dRes, gRes] = await Promise.all([fetch('/api/devices?all=true'), fetch('/api/geofences?all=true')]);
        if (!dRes.ok || !gRes.ok) return;
        const devices = await dRes.json();
        const geofences = await gRes.json();

        for (const dev of devices) {
          const req = dev?.attributes?.anchorRequest;
          const existing = geofences.filter((g) => isAnchorOf(g, dev.id));

          if (req) handled.add(Number(dev.id));
          if (req && req.latitude && req.longitude && !existing.length) {
            const res = await fetch('/api/geofences', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: 'ANCORA_' + dev.id + ' - ' + (dev.name || 'Veiculo'),
                description: 'Ancora automatica',
                area: 'CIRCLE (' + req.latitude + ' ' + req.longitude + ', ' + (req.radius || 100) + ')',
                attributes: {},
              }),
            });
            if (res.ok) {
              const geofence = await res.json();
              await link({ deviceId: Number(dev.id), geofenceId: geofence.id });
              const uRes = await fetch('/api/users?deviceId=' + Number(dev.id)).catch(() => null);
              if (uRes && uRes.ok) {
                const users = await uRes.json();
                await Promise.all(users.map((u) => link({ userId: u.id, geofenceId: geofence.id })));
              }
            }
          }

          if (!req && existing.length && handled.has(Number(dev.id))) {
            handled.delete(Number(dev.id));
            await Promise.all(existing.map((g) => fetch('/api/geofences/' + g.id, { method: 'DELETE' })));
          }
        }
      } catch (err) { /* ignora */ }
    };

    sync();
    const timer = setInterval(() => { if (!stopped) sync(); }, 4000);
    return () => { stopped = true; clearInterval(timer); };
  }, [isAdmin]);

  return null;
};

export default AnchorSync;


