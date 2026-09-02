import { useId, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import { map } from './core/MapView';

const MapAnchor = () => {
  const sourceId = useId();
  const theme = useTheme();
  
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }

    if (!map.getLayer('anchor-circle-fill')) {
      map.addLayer({
        id: 'anchor-circle-fill',
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': theme.palette.error.main,
          'fill-opacity': 0.25
        }
      });
    }

    if (!map.getLayer('anchor-circle-line')) {
      map.addLayer({
        id: 'anchor-circle-line',
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': theme.palette.error.main,
          'line-width': 2,
          'line-opacity': 0.9
        }
      });
    }

    return () => {
      if (!map) return;
      if (map.getLayer('anchor-circle-line')) map.removeLayer('anchor-circle-line');
      if (map.getLayer('anchor-circle-fill')) map.removeLayer('anchor-circle-fill');
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [sourceId, theme]);

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource(sourceId);
    if (!source) return;

    let features = [];

    if (selectedDeviceId) {
      const device = devices[selectedDeviceId];
      const position = positions[selectedDeviceId];

      if (device && position && position.longitude !== undefined && position.latitude !== undefined) {
        const anchor = device.attributes?.anchor;
        const isAnchored = anchor === true || anchor === 'true' || anchor === 1 || anchor === '1';

        if (isAnchored) {
          const lng = Number(position.longitude);
          const lat = Number(position.latitude);
          const radius = Number(device.attributes?.anchorRadius) || 50;

          const coords = [];
          const earthRadius = 6378137;
          const steps = 64;
          const latRad = (lat * Math.PI) / 180;

          for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const cLat = lat + ((radius / earthRadius) * (180 / Math.PI)) * Math.cos(angle);
            const cLng = lng + ((radius / earthRadius) * (180 / Math.PI)) * Math.sin(angle) / Math.cos(latRad);
            coords.push([cLng, cLat]);
          }

          features.push({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [coords]
            }
          });
        }
      }
    }

    source.setData({
      type: 'FeatureCollection',
      features
    });
  }, [devices, positions, selectedDeviceId, sourceId]);

  return null;
};

export default MapAnchor;