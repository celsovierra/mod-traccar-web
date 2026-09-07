import { useEffect } from 'react';
import * as maplibregl from 'maplibre-gl';
import { map } from './core/MapView';

const MIN_STOP_MS = 1 * 60 * 1000;

const formatDuration = (ms) => {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const detectStops = (positions) => {
  const stops = [];
  let start = null;
  let lat = 0;
  let lng = 0;
  let startTime = '';
  positions.forEach((p) => {
    const ignition = p.attributes && p.attributes.ignition;
    const stopped = (p.speed || 0) < 1;
    if (stopped) {
      if (start === null) {
        start = new Date(p.fixTime).getTime();
        lat = p.latitude;
        lng = p.longitude;
        startTime = p.fixTime;
      }
    } else if (start !== null) {
      const duration = new Date(p.fixTime).getTime() - start;
      if (duration >= MIN_STOP_MS) stops.push({ lat, lng, duration, startTime });
      start = null;
    }
  });
  if (start !== null && positions.length) {
    const duration = new Date(positions[positions.length - 1].fixTime).getTime() - start;
    if (duration >= MIN_STOP_MS) stops.push({ lat, lng, duration, startTime });
  }
  return stops;
};

const MapRouteStops = ({ positions }) => {
  useEffect(() => {
    const markers = [];
    console.log('DEBUG paradas', (positions||[]).length, detectStops(positions||[]));
    detectStops(positions || []).forEach((stop) => {
      const startDate = new Date(stop.startTime);
      const endDate = new Date(startDate.getTime() + stop.duration);
      const dateStr = startDate.toLocaleDateString('pt-BR');
      const startStr = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const endStr = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const durationStr = formatDuration(stop.duration);
      const uid = `${stop.lat.toFixed(5)}-${startDate.getTime()}`;

      const el = document.createElement('div');
      el.style.cssText = 'display:flex;align-items:center;gap:4px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.4);border:2px solid #fff;cursor:pointer;';
      el.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>${durationStr}`;

      const html = `
        <div style="font-family:system-ui,sans-serif;min-width:220px;padding:4px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <div style="background:#7c3aed;color:#fff;font-weight:800;font-size:14px;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;">P</div>
            <span style="font-weight:700;font-size:16px;color:#333;">Parada</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#555;">
            <div style="display:flex;gap:8px;"><span>&#128197;</span><span>${dateStr}</span></div>
            <div style="display:flex;gap:8px;"><span>&#128336;</span><span>${startStr} - ${endStr}</span></div>
            <div style="display:flex;gap:8px;"><span>&#9208;</span><span style="color:#7c3aed;font-weight:700;">${durationStr}</span></div>
            <div id="stop-addr-${uid}" style="display:flex;gap:8px;align-items:flex-start;"><span>&#128205;</span><span style="color:#888;">Carregando endereco...</span></div>
          </div>
          <button id="stop-share-${uid}" style="margin-top:12px;width:100%;background:#7c3aed;color:#fff;border:none;padding:10px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">Compartilhar</button>
        </div>`;

      const popup = new maplibregl.Popup({ maxWidth: '300px', offset: 16 }).setHTML(html);

      popup.on('open', async () => {
        const shareBtn = document.getElementById(`stop-share-${uid}`);
        if (shareBtn) {
          shareBtn.onclick = () => {
            const addrEl = document.getElementById(`stop-addr-${uid}`);
            const addr = addrEl ? addrEl.innerText : '';
            const txt = `Parada\n${dateStr}\n${startStr} - ${endStr}\n${durationStr}\n${addr}\n\nhttps://www.google.com/maps?q=${stop.lat},${stop.lng}`;
            navigator.clipboard.writeText(txt);
            shareBtn.textContent = 'Copiado!';
            setTimeout(() => { shareBtn.textContent = 'Compartilhar'; }, 1500);
          };
        }
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${stop.lat}&lon=${stop.lng}&format=json&addressdetails=1`);
          const data = await res.json();
          const addrEl = document.getElementById(`stop-addr-${uid}`);
          if (addrEl) {
            const a = data.address || {};
            const parts = [a.road, a.house_number, a.suburb || a.neighbourhood, a.city || a.town || a.village].filter(Boolean);
            const short = parts.join(', ') || (data.display_name || '').split(',').slice(0, 3).join(',') || 'Endereco nao encontrado';
            addrEl.innerHTML = `<span>&#128205;</span><span>${short}</span>`;
          }
        } catch (error) { /* silent */ }
      });

      markers.push(new maplibregl.Marker({ element: el }).setLngLat([stop.lng, stop.lat]).setPopup(popup).addTo(map));
    });
    return () => markers.forEach((m) => m.remove());
  }, [positions]);

  return null;
};

export default MapRouteStops;

