import React, { useEffect } from 'react';
import { getAllAnchors } from '../common/util/anchorStore';

const createCirclePolygon = (lat, lon, radiusMeters = 50, points = 64) => {
  const coords = [];
  const km = radiusMeters / 1000;
  const radLat = lat * (Math.PI / 180);
  const distanceX = km / (111.32 * Math.cos(radLat));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lon + x, lat + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {},
  };
};

const MapAnchorCircle = ({ anchor }) => {
  useEffect(() => {
    // Procura a instância global do mapa do MapLibre injetada no window ou DOM se disponível
    const findMapInstance = () => {
      if (window.maplibreMapInstance) return window.maplibreMapInstance;
      // Tenta varrer elementos do maplibre se expostos
      return null;
    };

    const mapInstance = findMapInstance();
    if (!mapInstance) return;

    const updateAnchorLayers = () => {
      try {
        const anchors = getAllAnchors();
        const activeAnchors = [];
        if (anchor?.active && anchor.lat != null && anchor.lon != null) {
          activeAnchors.push(anchor);
        }
        Object.values(anchors).forEach((a) => {
          if (a?.active && a.lat != null && a.lon != null) {
            if (!activeAnchors.some((existing) => existing.lat === a.lat && existing.lon === a.lon)) {
              activeAnchors.push(a);
            }
          }
        });

        const features = activeAnchors.map((a) => createCirclePolygon(a.lat, a.lon, a.radius || 50));
        const geojson = {
          type: 'FeatureCollection',
          features,
        };

        const sourceId = 'local-anchor-source';
        const fillLayerId = 'local-anchor-fill';
        const lineLayerId = 'local-anchor-line';

        if (!mapInstance.isStyleLoaded()) return;

        if (mapInstance.getSource(sourceId)) {
          mapInstance.getSource(sourceId).setData(geojson);
        } else {
          mapInstance.addSource(sourceId, {
            type: 'geojson',
            data: geojson,
          });

          if (!mapInstance.getLayer(fillLayerId)) {
            mapInstance.addLayer({
              id: fillLayerId,
              type: 'fill',
              source: sourceId,
              paint: {
                'fill-color': '#ef4444',
                'fill-opacity': 0.25,
              },
            });
          }

          if (!mapInstance.getLayer(lineLayerId)) {
            mapInstance.addLayer({
              id: lineLayerId,
              type: 'line',
              source: sourceId,
              paint: {
                'line-color': '#ef4444',
                'line-width': 2,
                'line-dasharray': [2, 2],
              },
            });
          }
        }
      } catch (e) {}
    };

    const interval = setInterval(updateAnchorLayers, 1000);
    return () => clearInterval(interval);
  }, [anchor]);

  return null;
};

export default MapAnchorCircle;
