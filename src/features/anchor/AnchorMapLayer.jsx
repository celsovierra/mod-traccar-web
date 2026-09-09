import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { map } from "../../map/core/MapView";

const SOURCE = "anchor-source";
const RADIUS = 100;

const circle = (lat, lon, radius) => {
  const pts = []; const d = radius / 6378137;
  const la0 = (lat * Math.PI) / 180; const lo0 = (lon * Math.PI) / 180;
  for (let i = 0; i <= 64; i += 1) {
    const b = (i * 2 * Math.PI) / 64;
    const la = Math.asin(Math.sin(la0) * Math.cos(d) + Math.cos(la0) * Math.sin(d) * Math.cos(b));
    const lo = lo0 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la0), Math.cos(d) - Math.sin(la0) * Math.sin(la));
    pts.push([(lo * 180) / Math.PI, (la * 180) / Math.PI]);
  }
  return pts;
};

export const AnchorMapLayer = () => {
  const geofences = useSelector((state) => state.geofences.items);
  const devices = useSelector((state) => state.devices.items);
  const user = useSelector((state) => state.session.user);
  const [local, setLocal] = useState({});

  useEffect(() => {
    const handler = (e) => setLocal((prev) => {
      const next = { ...prev };
      if (e.detail.active) next[e.detail.deviceId] = e.detail;
      else delete next[e.detail.deviceId];
      return next;
    });
    window.addEventListener("anchor-local", handler);
    return () => window.removeEventListener("anchor-local", handler);
  }, []);

  useEffect(() => {
    const allowed = (deviceId) => Boolean(user?.administrator) || Boolean(devices?.[Number(deviceId)] || devices?.[String(deviceId)]);
    const items = new Map();
    Object.values(geofences || {}).forEach((item) => {
      const m = String(item.name || "").match(/^ANCORA_(\d+)/);
      const c = String(item.area || "").match(/CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([\d.]+)\s*\)/i);
      if (m && c && allowed(m[1])) items.set(String(m[1]), { lat: parseFloat(c[1]), lon: parseFloat(c[2]), radius: parseFloat(c[3]) });
    });
    Object.entries(local).forEach(([id, v]) => {
      if (allowed(id)) items.set(String(id), { lat: v.latitude, lon: v.longitude, radius: v.radius || RADIUS });
    });
    let rafId = 0;
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      if (!map) return;
      if (!map.style || !map.getStyle()) { rafId = requestAnimationFrame(draw); return; }
      const data = {
        type: "FeatureCollection",
        features: Array.from(items.values()).map((v) => ({
          type: "Feature", properties: {},
          geometry: { type: "Polygon", coordinates: [circle(v.lat, v.lon, v.radius)] },
        })),
      };
      if (!map.getSource(SOURCE)) map.addSource(SOURCE, { type: "geojson", data });
      else map.getSource(SOURCE).setData(data);
      if (!map.getLayer("anchor-fill")) map.addLayer({ id: "anchor-fill", type: "fill", source: SOURCE, paint: { "fill-color": "#ff3b30", "fill-opacity": 0.2 } });
      if (!map.getLayer("anchor-line")) map.addLayer({ id: "anchor-line", type: "line", source: SOURCE, paint: { "line-color": "#ff3b30", "line-width": 2 } });
    };
    draw();
    map?.on("styledata", draw);
    return () => { cancelled = true; if (rafId) cancelAnimationFrame(rafId); map?.off("styledata", draw); };
  }, [geofences, devices, user, local]);

  return null;
};

export default AnchorMapLayer;



