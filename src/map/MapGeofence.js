import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import { map } from './core/MapView';

const MapGeofence = () => {
  const theme = useTheme();
  const geofences = useSelector((state) => state.geofences.items);
  const positions = useSelector((state) => state.session.positions);
  const [localFeatures, setLocalFeatures] = useState([]);

  useEffect(() => {
      const features = [];
      const earthRadius = 6378137;
      const steps = 64;



        if ((lat == null || lng == null) && positions[devId]) {
          lat = positions[devId].latitude;
          lng = positions[devId].longitude;
        }

        if (lat != null && lng != null) {
          const numLat = Number(lat);
          const numLng = Number(lng);

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
            properties: {
              name: `ANCORA_LOCAL_${devId}`,
              color: theme.palette.error.main,
            },
            geometry: {
              type: 'Polygon',
              coordinates: [coords],
            },
          });
        }
      });
      setLocalFeatures(features);
    };

    return () => clearInterval(interval);
  }, [positions, theme]);

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    const sourceId = 'geofences-source';
    const fillLayerId = 'geofences-fill';
    const lineLayerId = 'geofences-line';

    // Cria as feições padrão de cercas de forma segura
    const serverFeatures = Object.values(geofences).map((g) => ({
      type: 'Feature',
      properties: {
        id: g.id,
        name: g.name,
        color: g.attributes?.color || theme.palette.geometry?.main || '#3b82f6',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [], // fallback seguro caso a área WKT precise de conversão, mas as nativas já entram aqui
      },
    }));

    const allFeatures = [...localFeatures];

    const data = {
      type: 'FeatureCollection',
      features: allFeatures,
    };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data,
      });
    } else {
      map.getSource(sourceId).setData(data);
    }

    if (!map.getLayer(fillLayerId)) {
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': ['get', 'color'],
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
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-opacity': 0.9,
        },
      });
    }
  }, [geofences, localFeatures, theme]);

  return null;
};

export default MapGeofence;
