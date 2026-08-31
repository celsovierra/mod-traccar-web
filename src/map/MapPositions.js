import { useId, useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { map } from './core/MapView';
import { formatTime, getStatusColor } from '../common/util/formatter';
import { mapIconKey } from './core/preloadImages';
import { useAttributePreference } from '../common/util/preferences';
import { useCatchCallback } from '../reactHelper';
import { findFonts, fromMapCoordinates, toMapCoordinates } from './core/mapUtil';

const createGeoJSONCircle = (center, radiusInMeters, points = 64) => {
  const coords = {
    latitude: center[1],
    longitude: center[0],
  };
  const km = radiusInMeters / 1000;
  const ret = [];
  const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i += 1) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret],
    },
  };
};

const MapPositions = ({
  positions,
  onMapClick,
  onMarkerClick,
  showStatus,
  selectedPosition,
  titleField,
  disabled,
}) => {
  const id = useId();
  const clusters = `${id}-clusters`;
  const clustersCircle = `${id}-clusters-circle`;
  const selected = `${id}-selected`;
  const anchorSource = `${id}-anchor-source`;
  const anchorFillLayer = `${id}-anchor-fill`;
  const anchorLineLayer = `${id}-anchor-line`;

  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const iconScale = useAttributePreference('iconScale', desktop ? 0.75 : 1);

  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const reduxPositions = useSelector((state) => state.session.positions);

  const mapCluster = useAttributePreference('mapCluster', true);
  const directionType = useAttributePreference('mapDirection', 'selected');

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const animatedPositions = useRef({});
  const animationFrameRef = useRef(null);
  const prevSelectedId = useRef(null);

  const [anchorVersion, setAnchorVersion] = useState(0);

  useEffect(() => {
    const handleAnchorEvent = () => setAnchorVersion((v) => v + 1);
    window.addEventListener('anchorUpdate', handleAnchorEvent);
    return () => window.removeEventListener('anchorUpdate', handleAnchorEvent);
  }, []);

  // Força o zoom 17 ao selecionar qualquer veículo (na lista ou no mapa)
  useEffect(() => {
    if (selectedDeviceId) {
      const posList = positions?.length ? positions : Object.values(reduxPositions || {});
      const targetPos = posList.find((p) => Number(p.deviceId) === Number(selectedDeviceId));

      if (targetPos && prevSelectedId.current !== selectedDeviceId) {
        prevSelectedId.current = selectedDeviceId;

        const coords = toMapCoordinates(targetPos.longitude, targetPos.latitude);

        setTimeout(() => {
          map.flyTo({
            center: coords,
            zoom: 17,
            speed: 1.6,
            curve: 1,
            essential: true,
          });
        }, 60);
      }
    } else {
      prevSelectedId.current = null;
    }
  }, [selectedDeviceId, positions, reduxPositions]);

  const createFeature = useCallback(
    (devices, position, selectedPositionId, animatedCoord, animatedRotation) => {
      const device = devices[position.deviceId];
      let showDirection;
      switch (directionType) {
        case 'none':
          showDirection = false;
          break;
        case 'all':
          showDirection = position.course > 0;
          break;
        default:
          showDirection = selectedPositionId === position.id && position.course > 0;
          break;
      }
      return {
        id: position.id,
        deviceId: position.deviceId,
        name: device ? device.name : '',
        fixTime: formatTime(position.fixTime, 'seconds'),
        category: mapIconKey(device ? device.category : ''),
        color: showStatus ? (position.attributes?.color || getStatusColor(device?.status)) : 'neutral',
        rotation: animatedRotation !== undefined ? animatedRotation : (position.course || 0),
        direction: showDirection,
      };
    },
    [directionType, showStatus],
  );

  const onMouseEnter = () => (map.getCanvas().style.cursor = 'pointer');
  const onMouseLeave = () => (map.getCanvas().style.cursor = '');

  const onMapClickCallback = useCallback(
    (event) => {
      if (!event.defaultPrevented && onMapClick) {
        const [longitude, latitude] = fromMapCoordinates(event.lngLat.lng, event.lngLat.lat);
        onMapClick(latitude, longitude);
      }
    },
    [onMapClick],
  );

  const onMarkerClickCallback = useCallback(
    (event) => {
      if (disabledRef.current) return;
      event.preventDefault();
      const feature = event.features[0];
      if (feature?.properties) {
        const devId = Number(feature.properties.deviceId);
        const positionId = Number(feature.properties.id);
        const coords = feature.geometry.coordinates;

        prevSelectedId.current = devId;

        setTimeout(() => {
          map.flyTo({
            center: coords,
            zoom: 17,
            speed: 1.6,
            curve: 1,
            essential: true,
          });
        }, 60);

        if (onMarkerClick) {
          onMarkerClick(positionId, devId);
        }
      }
    },
    [onMarkerClick],
  );

  const onClusterClick = useCatchCallback(
    async (event) => {
      if (disabledRef.current) return;
      event.preventDefault();
      const features = map.queryRenderedFeatures(event.point, {
        layers: [clustersCircle, clusters],
      });
      const clusterId = features[0].properties.cluster_id;
      const zoom = await map.getSource(id).getClusterExpansionZoom(clusterId);
      map.easeTo({
        center: features[0].geometry.coordinates,
        zoom,
      });
    },
    [clusters, clustersCircle, id],
  );

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      cluster: mapCluster,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
    map.addSource(selected, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    map.addSource(anchorSource, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    map.addLayer({
      id: anchorFillLayer,
      type: 'fill',
      source: anchorSource,
      paint: {
        'fill-color': '#ef4444',
        'fill-opacity': 0.18,
      },
    });

    map.addLayer({
      id: anchorLineLayer,
      type: 'line',
      source: anchorSource,
      paint: {
        'line-color': '#ef4444',
        'line-width': 2.5,
        'line-dasharray': [3, 2],
      },
    });

    [id, selected].forEach((source) => {
      map.addLayer({
        id: source,
        type: 'symbol',
        source,
        filter: ['!has', 'point_count'],
        layout: {
          'icon-image': '{category}-{color}',
          'icon-size': iconScale,
          'icon-allow-overlap': true,
          'icon-rotate': ['get', 'rotation'],
          'icon-rotation-alignment': 'map',
          'text-field': `{${titleField || 'name'}}`,
          'text-allow-overlap': true,
          'text-anchor': 'bottom',
          'text-offset': [0, -2 * iconScale],
          'text-font': findFonts(map),
          'text-size': 12,
          'text-rotation-alignment': 'viewport',
          'symbol-sort-key': ['get', 'id'],
        },
        paint: {
          'text-halo-color': 'white',
          'text-halo-width': 1,
        },
      });
      map.addLayer({
        id: `direction-${source}`,
        type: 'symbol',
        source,
        filter: ['all', ['!has', 'point_count'], ['==', 'direction', true]],
        layout: {
          'icon-image': 'direction',
          'icon-size': iconScale,
          'icon-allow-overlap': true,
          'icon-rotate': ['get', 'rotation'],
          'icon-rotation-alignment': 'map',
        },
      });

      map.on('mouseenter', source, onMouseEnter);
      map.on('mouseleave', source, onMouseLeave);
      map.on('click', source, onMarkerClickCallback);
    });

    // Círculos com cores por quantidade agrupada
    map.addLayer({
      id: clustersCircle,
      type: 'circle',
      source: id,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#10b981',
          10,
          '#3b82f6',
          30,
          '#f59e0b',
          100,
          '#ef4444',
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          18,
          10,
          22,
          30,
          26,
          100,
          32,
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });

    // Texto com o número dentro do círculo
    map.addLayer({
      id: clusters,
      type: 'symbol',
      source: id,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': findFonts(map),
        'text-size': 13,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    map.on('mouseenter', clustersCircle, onMouseEnter);
    map.on('mouseleave', clustersCircle, onMouseLeave);
    map.on('click', clustersCircle, onClusterClick);

    map.on('mouseenter', clusters, onMouseEnter);
    map.on('mouseleave', clusters, onMouseLeave);
    map.on('click', clusters, onClusterClick);
    map.on('click', onMapClickCallback);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      map.off('mouseenter', clustersCircle, onMouseEnter);
      map.off('mouseleave', clustersCircle, onMouseLeave);
      map.off('click', clustersCircle, onClusterClick);

      map.off('mouseenter', clusters, onMouseEnter);
      map.off('mouseleave', clusters, onMouseLeave);
      map.off('click', clusters, onClusterClick);
      map.off('click', onMapClickCallback);

      if (map.getLayer(anchorLineLayer)) map.removeLayer(anchorLineLayer);
      if (map.getLayer(anchorFillLayer)) map.removeLayer(anchorFillLayer);
      if (map.getSource(anchorSource)) map.removeSource(anchorSource);

      if (map.getLayer(clusters)) {
        map.removeLayer(clusters);
      }
      if (map.getLayer(clustersCircle)) {
        map.removeLayer(clustersCircle);
      }

      [id, selected].forEach((source) => {
        map.off('mouseenter', source, onMouseEnter);
        map.off('mouseleave', source, onMouseLeave);
        map.off('click', source, onMarkerClickCallback);

        if (map.getLayer(source)) {
          map.removeLayer(source);
        }
        if (map.getLayer(`direction-${source}`)) {
          map.removeLayer(`direction-${source}`);
        }
        if (map.getSource(source)) {
          map.removeSource(source);
        }
      });
    };
  }, [
    mapCluster,
    clusters,
    clustersCircle,
    onMarkerClickCallback,
    onClusterClick,
    onMapClickCallback,
    iconScale,
    id,
    selected,
    titleField,
    anchorSource,
    anchorFillLayer,
    anchorLineLayer,
  ]);

  // Atualização do Círculo da Âncora
  useEffect(() => {
    const anchorFeatures = [];
    Object.keys(devices).forEach((devId) => {
      const anchorRaw = localStorage.getItem(`device_anchor_${devId}`);
      if (anchorRaw) {
        try {
          const anchor = JSON.parse(anchorRaw);
          const coords = toMapCoordinates(anchor.longitude, anchor.latitude);
          const circleFeature = createGeoJSONCircle(coords, anchor.radius || 50);
          anchorFeatures.push(circleFeature);
        } catch (e) {
          // ignore error
        }
      }
    });

    if (map.getSource(anchorSource)) {
      map.getSource(anchorSource).setData({
        type: 'FeatureCollection',
        features: anchorFeatures,
      });
    }
  }, [anchorSource, anchorVersion, devices, selectedDeviceId]);

  useEffect(() => {
    const duration = 3500;
    const startTime = performance.now();

    positions.forEach((p) => {
      if (!devices.hasOwnProperty(p.deviceId)) return;
      const targetCoord = toMapCoordinates(p.longitude, p.latitude);
      const targetRotation = p.course || 0;

      const current = animatedPositions.current[p.deviceId];
      if (!current) {
        animatedPositions.current[p.deviceId] = {
          currentCoord: targetCoord,
          startCoord: targetCoord,
          targetCoord,
          currentRotation: targetRotation,
          startRotation: targetRotation,
          targetRotation,
        };
      } else {
        const diffRot = (targetRotation - (current.currentRotation % 360) + 540) % 360 - 180;
        current.startCoord = [...current.currentCoord];
        current.targetCoord = targetCoord;
        current.startRotation = current.currentRotation;
        current.targetRotation = current.currentRotation + diffRot;
      }
    });

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const ease = -(Math.cos(Math.PI * progress) - 1) / 2;

      Object.keys(animatedPositions.current).forEach((devId) => {
        const item = animatedPositions.current[devId];
        item.currentCoord = [
          item.startCoord[0] + (item.targetCoord[0] - item.startCoord[0]) * ease,
          item.startCoord[1] + (item.targetCoord[1] - item.startCoord[1]) * ease,
        ];
        item.currentRotation = item.startRotation + (item.targetRotation - item.startRotation) * ease;
      });

      const buildFeatures = (sourceTarget) =>
        positions
          .filter((it) => devices.hasOwnProperty(it.deviceId))
          .filter((it) =>
            sourceTarget === id ? it.deviceId !== selectedDeviceId : it.deviceId === selectedDeviceId,
          )
          .map((position) => {
            const anim = animatedPositions.current[position.deviceId];
            const coords = anim ? anim.currentCoord : toMapCoordinates(position.longitude, position.latitude);
            const rot = anim ? anim.currentRotation : position.course;
            return {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: coords,
              },
              properties: createFeature(
                devices,
                position,
                selectedPosition && selectedPosition.id,
                coords,
                rot,
              ),
            };
          });

      map.getSource(id)?.setData({ type: 'FeatureCollection', features: buildFeatures(id) });
      map.getSource(selected)?.setData({ type: 'FeatureCollection', features: buildFeatures(selected) });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [
    mapCluster,
    clusters,
    clustersCircle,
    devices,
    positions,
    selectedPosition,
    createFeature,
    id,
    selected,
    selectedDeviceId,
  ]);

  return null;
};

export default MapPositions;