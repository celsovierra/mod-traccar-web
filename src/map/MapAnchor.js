import { useId, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import { map } from './core/MapView';
import { getAllAnchors } from '../common/util/anchorStore';

const MapAnchor = () => {
  const sourceId = useId();
  const theme = useTheme();
  
  const positions = useSelector((state) => state.session.positions);

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
          'line-opacity': 0.9,
          'line-dasharray': [2, 2]
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

    const updateFeatures = () => {
      const anchors = getAllAnchors();
      const features = [];
      const earthRadius = 6378137;
      const steps = 64;

      Object.entries(anchors).forEach(([devId, anchorData]) => {
        if (!anchorData || !anchorData.active) return;

        let lat = anchorData.lat;
        let lng = anchorData.lon;

        // Se por acaso faltar lat/lon na âncora salva mas a posição atual estiver disponível, usa a da posição
        if ((lat == null || lng == null) && positions[devId]) {
          lat = positions[devId].latitude;
          lng = positions[devId].longitude;
        }

        if (lat != null && lng != null) {
          const numLat = Number(lat);
          const numLng = Number(lng);
          const radius = Number(anchorData.radius) || 50;

          const coords = [];
          const latRad = (numLat * Math.PI) / 180;

          for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const cLat = numLat + ((radius / earthRadius) * (180 / Math.PI)) * Math.cos(angle);
            const cLng = numLng + ((radius / earthRadius) * (180 / Math.PI)) * Math.sin(angle) / Math.cos(latRad);
            coords.push([cLng, cLat]);
          }

          features.push({
            type: 'Feature',
            properties: { deviceId: devId },
            geometry: {
              type: 'Polygon',
              coordinates: [coords]
            }
          });
        }
      });

      source.setData({
        type: 'FeatureCollection',
        features
      });
    };

    updateFeatures();
    const interval = setInterval(updateFeatures, 1000);
    return () => clearInterval(interval);
  }, [positions, sourceId]);

  return null;
};

export default MapAnchor;
