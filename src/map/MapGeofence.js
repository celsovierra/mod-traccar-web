import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { map } from "./core/MapView";
import { geofencesActions } from "../store";

const SOURCE = "geofences-source";

const circleToPolygon = (lat, lon, radius) => {
  const points = [];
  const d = radius / 6378137;
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  for (let i = 0; i <= 64; i += 1) {
    const b = (i * 2 * Math.PI) / 64;
    const la = Math.asin(Math.sin(latR) * Math.cos(d) + Math.cos(latR) * Math.sin(d) * Math.cos(b));
    const lo = lonR + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(latR), Math.cos(d) - Math.sin(latR) * Math.sin(la));
    points.push([(lo * 180) / Math.PI, (la * 180) / Math.PI]);
  }
  return points;
};

const toFeature = (item) => {
  const area = String(item.area || "");
  const circle = area.match(/CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([\d.]+)\s*\)/i);
  if (circle) {
    return {
      type: "Feature",
      properties: { name: item.name, color: "#ff3b30" },
      geometry: { type: "Polygon", coordinates: [circleToPolygon(parseFloat(circle[1]), parseFloat(circle[2]), parseFloat(circle[3]))] },
    };
  }
  const polygon = area.match(/POLYGON\s*\(\((.+)\)\)/i);
  if (polygon) {
    const coords = polygon[1].split(",").map((p) => {
      const [la, lo] = p.trim().split(/\s+/).map(Number);
      return [lo, la];
    });
    return { type: "Feature", properties: { name: item.name, color: "#3bb2d0" }, geometry: { type: "Polygon", coordinates: [coords] } };
  }
  return null;
};

const MapGeofence = () => {
  const dispatch = useDispatch();
  const geofences = useSelector((state) => state.geofences.items);
  const devices = useSelector((state) => state.devices.items);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/geofences");
      if (res.ok) dispatch(geofencesActions.refresh(await res.json()));
    };
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [dispatch]);

  useEffect(() => {
    const visible = (item) => {
      const anchor = String(item.name || "").match(/^ANCORA_(\d+)/);
      if (!anchor) return true;
      return Boolean(devices?.[Number(anchor[1])]);
    };

    const draw = () => {
      if (!map) return;
      if (!map.isStyleLoaded()) { map.once("idle", draw); return; }
      const data = {
        type: "FeatureCollection",
        features: Object.values(geofences || {}).filter(visible).map(toFeature).filter(Boolean),
      };
      if (!map.getSource(SOURCE)) map.addSource(SOURCE, { type: "geojson", data });
      else map.getSource(SOURCE).setData(data);

      if (!map.getLayer("geofences-fill")) {
        map.addLayer({ id: "geofences-fill", type: "fill", source: SOURCE, paint: { "fill-color": ["get", "color"], "fill-opacity": 0.2 } });
      }
      if (!map.getLayer("geofences-line")) {
        map.addLayer({ id: "geofences-line", type: "line", source: SOURCE, paint: { "line-color": ["get", "color"], "line-width": 2 } });
      }
    };

    draw();
    map?.on("styledata", draw);
    return () => { map?.off("styledata", draw); };
  }, [geofences, devices]);

  return null;
};

export default MapGeofence;
