import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { map } from '../../map/core/MapView';

export const AnchorMapLayer = () => {
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    const sourceId = 'global-anchor-source';
    const fillLayerId = 'global-anchor-fill';
    const lineLayerId = 'global-anchor-line';

    const features = [];
    const earthRadius = 6378137;
    const steps = 64;

    Object.values(devices).forEach((device) => {
      const devId = device.id;
      const anchorRaw = device?.attributes?.anchor || localStorage.getItem(`device_anchor_${devId}`);
      let anchor = null;

      if (typeof anchorRaw === 'string') {
        try { anchor = JSON.parse(anchorRaw); } catch (e) {}
      } else {
        anchor = anchorRaw;
      }

      if (anchor && (anchor.active || anchor.latitude)) {
        let lat = Number(anchor.latitude);
        let lng = Number(anchor.longitude);
        const radius = Number(anchor.radius) || 50;

        if ((isNaN(lat) || isNaN(lng)) && positions[devId]) {
          lat = positions[devId].latitude;
          lng = positions[devId].longitude;
        }

        if (!isNaN(lat) && !isNaN(lng)) {
          const coords = [];
          const latRad = (lat * Math.PI) / 180;

          for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const cLat = lat + ((radius / earthRadius) * (180 / Math.PI)) * Math.cos(angle);
            const cLng = lng + ((radius / earthRadius) * (180 / Math.PI)) * Math.sin(angle) / Math.cos(latRad);
            coords.push([cLng, cLat]);
          }

          features.push({
            type: 'Feature',
            properties: { id: devId },
            geometry: {
              type: 'Polygon',
              coordinates: [coords],
            },
          });
        }
      }
    });

    const data = { type: 'FeatureCollection', features };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: 'geojson', data });
    } else {
      map.getSource(sourceId).setData(data);
    }

    if (!map.getLayer(fillLayerId)) {
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#ef4444',
          'fill-opacity': 0.25,
        },
      });
    }

    if (!map.getLayer(lineLayerId)) {
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#ef4444',
          'line-width': 2,
          'line-opacity': 0.9,
        },
      });
    }
  }, [devices, positions]);

  return null;
};
