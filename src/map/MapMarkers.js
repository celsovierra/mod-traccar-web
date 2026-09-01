import { useId, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { map } from './core/MapView';
import { useAttributePreference } from '../common/util/preferences';
import { findFonts, toMapCoordinates } from './core/mapUtil';

const MapMarkers = ({ markers, showTitles }) => {
  const id = useId();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const iconScale = useAttributePreference('iconScale', desktop ? 0.75 : 1);

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    const layerConfig = {
      id,
      type: 'symbol',
      source: id,
      layout: {
        'icon-image': 'device-moto',
        'icon-size': iconScale,
        'icon-allow-overlap': true,
        'icon-rotation-alignment': 'map',
        'icon-rotate': ['get', 'rotation'],
      },
    };

    if (showTitles) {
      layerConfig.filter = ['!has', 'point_count'];
      layerConfig.layout['text-field'] = '{title}';
      layerConfig.layout['text-allow-overlap'] = true;
      layerConfig.layout['text-anchor'] = 'bottom';
      layerConfig.layout['text-offset'] = [0, -2 * iconScale];
      layerConfig.layout['text-font'] = findFonts(map);
      layerConfig.layout['text-size'] = 12;
      layerConfig.paint = {
        'text-halo-color': 'white',
        'text-halo-width': 1,
      };
    }

    map.addLayer(layerConfig);

    return () => {
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, [showTitles, iconScale, id]);

  useEffect(() => {
    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features: markers.map(({ latitude, longitude, course, title }) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: toMapCoordinates(longitude, latitude),
        },
        properties: {
          title: title || '',
          rotation: course || 0,
        },
      })),
    });
  }, [markers, id]);

  return null;
};

MapMarkers.defaultProps = {
  showTitles: false,
};

export default MapMarkers;