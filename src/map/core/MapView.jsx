import { getAllAnchors } from "../../common/util/anchorStore";
import 'maplibre-gl/dist/maplibre-gl.css';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { googleProtocol } from 'maplibre-google-maps';
import { Protocol } from 'pmtiles';
import { useRef, useLayoutEffect, useEffect, useState, useMemo, useId } from 'react';
import { useTheme } from '@mui/material';
import { useSelector } from 'react-redux';
import MapSwitcher from '../control/MapSwitcher';
import { useAttributePreference, usePreference } from '../../common/util/preferences';
import usePersistedState from '../../common/util/usePersistedState';
import { mapImages } from './preloadImages';
import useMapStyles from './useMapStyles';
import { useAsyncTask } from '../../reactHelper';

const element = document.createElement('div');
element.style.width = '100%';
element.style.height = '100%';
element.style.boxSizing = 'initial';

maplibregl.setWorkerUrl(maplibreWorkerUrl);
maplibregl.addProtocol('google', googleProtocol);
maplibregl.addProtocol('pmtiles', new Protocol().tile);

export const map = new maplibregl.Map({
  container: element,
  attributionControl: false,
});

let ready = false;
const readyListeners = new Set();

const addReadyListener = (listener) => {
  readyListeners.add(listener);
  listener(ready);
};

const removeReadyListener = (listener) => {
  readyListeners.delete(listener);
};

const updateReadyValue = (value) => {
  ready = value;
  readyListeners.forEach((listener) => listener(value));
};

const initMap = async () => {
  if (!map.hasImage('background')) {
    Object.entries(mapImages).forEach(([key, value]) => {
      map.addImage(key, value, {
        pixelRatio: window.devicePixelRatio,
      });
    });
  }
  if (!map.hasImage('device-moto')) {
    map.loadImage('/moto-template.png', (error, image) => {
      if (!error && image) {
        ['device-moto', 'moto', 'motorcycle', 'default-moto'].forEach((key) => {
          if (!map.hasImage(key)) {
            map.addImage(key, image);
          }
        });
      }
    });
  }
};

const MapAnchorInternal = () => {
  const sourceId = useId();
  const theme = useTheme();
  const [anchorVersion, setAnchorVersion] = useState(0);

  useEffect(() => {
    const handleAnchorChange = () => setAnchorVersion(v => v + 1);
    window.addEventListener('anchor-changed', handleAnchorChange);
    return () => window.removeEventListener('anchor-changed', handleAnchorChange);
  }, []);
  
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  useEffect(() => {
    if (!map) return;

    const setupLayer = () => {
      if (!map.loaded()) return;

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
            'fill-opacity': 0.4
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
            'line-width': 4,
            'line-opacity': 1.0
          }
        });
      }
    };

    if (map.loaded()) {
      setupLayer();
    } else {
      map.once('load', setupLayer);
    }

    const handleStyleData = () => {
      setupLayer();
    };

    map.on('styledata', handleStyleData);

    return () => {
      if (!map) return;
      map.off('styledata', handleStyleData);
      try {
        if (map.getLayer('anchor-circle-line')) map.removeLayer('anchor-circle-line');
        if (map.getLayer('anchor-circle-fill')) map.removeLayer('anchor-circle-fill');
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch (e) {
        // Ignora erros de limpeza caso o mapa esteja desmontando
      }
    };
  }, [sourceId, theme]);

  useEffect(() => {
    if (!map || !map.loaded()) return;
    const source = map.getSource(sourceId);
    if (!source) return;

    let features = [];
    const allAnchors = getAllAnchors();
    console.log("DEBUG ANCHORS STORE:", allAnchors, "SELECTED:", selectedDeviceId);
    
    // Itera por todas as âncoras salvas no storage, permitindo exibir mesmo se o deviceId vier como string/número
    Object.entries(allAnchors).forEach(([devId, anchor]) => {
      // Se houver um dispositivo selecionado, opcionalmente podemos dar preferência ou exibir todas as ativas

      const position = positions[devId];
      if (anchor && anchor.active) {
        const lat = Number(anchor.lat) || (position ? Number(position.latitude) : undefined);
        const lng = Number(anchor.lon) || (position ? Number(position.longitude) : undefined);
        const radius = Number(anchor.radius) || 50;
        console.log("DEBUG ANCHOR COORDS:", devId, lat, lng, radius);
        if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
          const coords = [];
          const earthRadius = 6378137;
          const latRad = (lat * Math.PI) / 180;

          for (let i = 0; i <= 64; i++) {
            const angle = (i / 64) * Math.PI * 2;
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
    });

    source.setData({
      type: 'FeatureCollection',
      features
    });
  }, [positions, selectedDeviceId, sourceId, anchorVersion]);

  return null;
};

const MapView = ({ children }) => {
  const theme = useTheme();

  const containerRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);

  const mapStyles = useMapStyles();
  const activeMapStyles = useAttributePreference(
    'activeMapStyles',
    'locationIqStreets,locationIqDark,openFreeMap',
  );
  const [selectedStyleId, setSelectedStyleId] = usePersistedState(
    'selectedMapStyle',
    usePreference('map', 'locationIqStreets'),
  );
  const maxZoom = useAttributePreference('web.maxZoom');

  const styles = useMemo(() => {
    const filtered = mapStyles.filter((s) => s.available && activeMapStyles.includes(s.id));
    return filtered.length ? filtered : mapStyles.filter((s) => s.id === 'osm');
  }, [mapStyles, activeMapStyles]);

  useAsyncTask(async () => {
    if (theme.direction === 'rtl') {
      maplibregl.setRTLTextPlugin('/mapbox-gl-rtl-text.js');
    }
  }, [theme.direction]);

  useEffect(() => {
    const attribution = new maplibregl.AttributionControl({ compact: true });
    const navigation = new maplibregl.NavigationControl();
    map.addControl(attribution, theme.direction === 'rtl' ? 'bottom-left' : 'bottom-right');
    map.addControl(navigation, theme.direction === 'rtl' ? 'top-left' : 'top-right');
    return () => {
      map.removeControl(navigation);
      map.removeControl(attribution);
    };
  }, [theme.direction]);

  useEffect(() => {
    if (maxZoom) {
      map.setMaxZoom(maxZoom);
    }
  }, [maxZoom]);

  useEffect(() => {
    const style = styles.find((s) => s.id === selectedStyleId);
    if (!style) {
      setSelectedStyleId(styles[0].id);
      return;
    }
    updateReadyValue(false);
    map.coordinateSystem = style.coordinateSystem;
    map.setStyle(style.style, { diff: false });
    map.setTransformRequest(style.transformRequest);
    let timeoutId;
    const waiting = () => {
      if (!map.loaded()) {
        timeoutId = setTimeout(waiting, 33);
      } else {
        initMap();
        updateReadyValue(true);
      }
    };
    map.once('styledata', waiting);
    return () => clearTimeout(timeoutId);
  }, [styles, selectedStyleId, setSelectedStyleId]);

  useEffect(() => {
    const listener = (ready) => setMapReady(ready);
    addReadyListener(listener);
    return () => {
      removeReadyListener(listener);
    };
  }, []);

  useLayoutEffect(() => {
    const currentEl = containerRef.current;
    currentEl.appendChild(element);
    map.resize();
    return () => {
      currentEl.removeChild(element);
    };
  }, [containerRef]);

  return (
    <div style={{ width: '100%', height: '100%' }} ref={containerRef}>
      <MapSwitcher styles={styles} selectedId={selectedStyleId} onSelect={setSelectedStyleId} />
      {mapReady && (
        <>
          {children}
          <MapAnchorInternal />
        </>
      )}
    </div>
  );
};

export default MapView;
