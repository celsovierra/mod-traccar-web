import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { makeStyles } from 'tss-react/mui';
import TimelineIcon from '@mui/icons-material/Timeline';
import { map } from '../core/MapView';

const useStyles = makeStyles()(() => ({
  button: {
    '&&': { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' },
    '&.active': { backgroundColor: '#dbeafe', color: '#2563eb', borderRadius: 'inherit' },
  },
}));

const TRAIL_DISTANCE_M = 1000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const STOP_MIN_MS = 60 * 1000;
const SOURCE_LINE = 'trail-line-src';
const SOURCE_STOPS = 'trail-stops-src';
const LAYER_LINE = 'trail-line';
const LAYER_STOPS = 'trail-stops';
const LAYER_STOPS_CIRCLE = 'trail-stops-circle';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const fmtHora = (ts) =>
  new Date(ts).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit',
    minute: '2-digit',
  });

const MapTrail = ({ selectedDeviceId }) => {
  const { classes } = useStyles();
  const activeRef = useRef(false);
  const dataRef = useRef(null);
  const deviceRef = useRef(selectedDeviceId);
  deviceRef.current = selectedDeviceId;

  useEffect(() => {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    const button = document.createElement('button');
    button.type = 'button';
    button.title = 'Mostrar rastro (1km)';
    button.className = 'maplibregl-ctrl-icon ' + classes.button;
    container.appendChild(button);
    const root = createRoot(button);
    root.render(<TimelineIcon fontSize="small" />);

    const clearLayers = () => {
      try {
        if (map.getLayer(LAYER_STOPS)) map.removeLayer(LAYER_STOPS);
        if (map.getLayer(LAYER_STOPS_CIRCLE)) map.removeLayer(LAYER_STOPS_CIRCLE);
        if (map.getLayer(LAYER_LINE)) map.removeLayer(LAYER_LINE);
        if (map.getSource(SOURCE_STOPS)) map.removeSource(SOURCE_STOPS);
        if (map.getSource(SOURCE_LINE)) map.removeSource(SOURCE_LINE);
      } catch (e) {}
    };

    const drawTrail = async () => {
      clearLayers();
      const devId = deviceRef.current;
      if (!devId) return;
      const since = new Date(Date.now() - MAX_AGE_MS).toISOString();
      const to = new Date().toISOString();
      let positions = [];
      try {
        const r = await fetch('/api/positions?deviceId=' + devId + '&from=' + since + '&to=' + to, {
          credentials: 'same-origin',
        });
        if (!r.ok) return;
        positions = await r.json();
      } catch (e) {
        return;
      }
      if (!Array.isArray(positions) || positions.length < 2) return;
      positions.sort((a, b) => new Date(a.fixTime) - new Date(b.fixTime));
      const coords = positions.map((p) => [p.longitude, p.latitude]);
      let total = 0;
      const trail = [coords[coords.length - 1]];
      for (let i = coords.length - 2; i >= 0; i--) {
        const [lon1, lat1] = coords[i + 1];
        const [lon2, lat2] = coords[i];
        total += haversine(lat1, lon1, lat2, lon2);
        trail.unshift(coords[i]);
        if (total >= TRAIL_DISTANCE_M) break;
      }
      if (trail.length < 2) return;

      map.addSource(SOURCE_LINE, {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: trail } },
      });
      map.addLayer({
        id: LAYER_LINE,
        type: 'line',
        source: SOURCE_LINE,
        paint: { 'line-color': '#2563eb', 'line-width': 6, 'line-opacity': 0.9 },
      });

      const startIdx = positions.length - trail.length;
      const stopFeatures = [];
      let stopStart = null;
      let stopCoords = null;
      for (let i = startIdx; i < positions.length; i++) {
        const p = positions[i];
        const next = positions[i + 1];
        const sameSpot =
          !next || haversine(p.latitude, p.longitude, next.latitude, next.longitude) < 15;
        if (sameSpot) {
          if (!stopStart) {
            stopStart = new Date(p.fixTime).getTime();
            stopCoords = [p.longitude, p.latitude];
          }
        } else {
          if (stopStart && stopCoords) {
            const dur = new Date(p.fixTime).getTime() - stopStart;
            if (dur >= STOP_MIN_MS) {
              stopFeatures.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: stopCoords },
                properties: {
                  duracao: Math.round(dur / 60000),
                  chegou: fmtHora(stopStart),
                  saiu: fmtHora(new Date(p.fixTime).getTime()),
                },
              });
            }
          }
          stopStart = null;
          stopCoords = null;
        }
      }
      if (stopStart && stopCoords && positions.length > startIdx) {
        const last = positions[positions.length - 1];
        const dur = new Date(last.fixTime).getTime() - stopStart;
        if (dur >= STOP_MIN_MS) {
          stopFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: stopCoords },
            properties: {
              duracao: Math.round(dur / 60000),
              chegou: fmtHora(stopStart),
              saiu: fmtHora(new Date(last.fixTime).getTime()),
            },
          });
        }
      }

      if (stopFeatures.length > 0) {
        map.addSource(SOURCE_STOPS, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: stopFeatures },
        });
        map.addLayer({
          id: LAYER_STOPS_CIRCLE,
          type: 'circle',
          source: SOURCE_STOPS,
          paint: {
            'circle-radius': 11,
            'circle-color': '#dc2626',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
          },
        });
        map.addLayer({
          id: LAYER_STOPS,
          type: 'symbol',
          source: SOURCE_STOPS,
          layout: { 'text-field': 'P', 'text-size': 13, 'text-allow-overlap': true },
          paint: { 'text-color': '#ffffff' },
        });
        const popup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: true,
          offset: 12,
          className: 'stop-popup-modern',
        });
        map.on('click', LAYER_STOPS_CIRCLE, (e) => {
          const f = e.features[0];
          const p = f.properties;
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              '<div style="font-family:system-ui;min-width:200px;"><div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:10px;">P Parada</div><div style="background:#f8fafc;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;"><div style="display:flex;justify-content:space-between;font-size:12px;"><span style="color:#64748b;">Chegou</span><span style="font-weight:700;color:#0f172a;">' +
                p.chegou +
                '</span></div><div style="display:flex;justify-content:space-between;font-size:12px;"><span style="color:#64748b;">Saiu</span><span style="font-weight:700;color:#0f172a;">' +
                p.saiu +
                '</span></div><div style="border-top:1px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between;font-size:12px;"><span style="color:#64748b;">Duracao</span><span style="font-weight:800;color:#dc2626;">' +
                p.duracao +
                ' min</span></div></div></div>',
            )
            .addTo(map);
        });
        map.on('mouseenter', LAYER_STOPS_CIRCLE, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', LAYER_STOPS_CIRCLE, () => {
          map.getCanvas().style.cursor = '';
        });
      }
    };

    button.onclick = async () => {
      activeRef.current = !activeRef.current;
      if (activeRef.current) {
        button.classList.add('active');
        await drawTrail();
      } else {
        button.classList.remove('active');
        clearLayers();
      }
    };

    const control = {
      onAdd: () => container,
      onRemove: () => {
        queueMicrotask(() => root.unmount());
        container.remove();
      },
    };
    map.addControl(control, 'top-right');

    dataRef.current = { drawTrail, clearLayers, control, button };

    return () => {
      clearLayers();
      try {
        map.removeControl(control);
      } catch (e) {}
    };
  }, [classes.button]);

  useEffect(() => {
    if (activeRef.current && dataRef.current) {
      activeRef.current = false;
      if (dataRef.current.button) dataRef.current.button.classList.remove('active');
      dataRef.current.clearLayers();
    }
  }, [selectedDeviceId]);

  return null;
};

export default MapTrail;
