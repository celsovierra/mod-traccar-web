import { useCallback, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch } from 'react-redux';
import MapView from '../map/core/MapView';
import MapSelectedDevice from '../map/main/MapSelectedDevice';
import MapAccuracy from '../map/main/MapAccuracy';
import MapGeofence from '../map/MapGeofence';

import AnchorMapLayer from '../features/anchor/AnchorMapLayer';
import MapCurrentLocation from '../map/MapCurrentLocation';
import PoiMap from '../map/main/PoiMap';
import MapPadding from '../map/MapPadding';
import { devicesActions } from '../store';
import MapDefaultCamera from '../map/main/MapDefaultCamera';
import MapLiveRoutes from '../map/main/MapLiveRoutes';
import MapPositions from '../map/MapPositions';
import MapOverlay from '../map/overlay/MapOverlay';
import MapGeocoder from '../map/control/MapGeocoder';
import MapScale from '../map/MapScale';
import MapRuler from '../map/control/MapRuler';
import { useAdministrator } from '../common/util/permissions';
import MapNotification from '../map/control/MapNotification';
import MapClusterToggle from '../map/control/MapClusterToggle';
import MapTelegramButton from '../map/control/MapTelegramButton';
import MapTrail from '../map/control/MapTrail';
import usePersistedState from '../common/util/usePersistedState';

const MainMap = ({ filteredPositions, selectedPosition, onEventsClick }) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const admin = useAdministrator();

  const [rulerActive, setRulerActive] = useState(false);
  const [mapCluster, setMapCluster] = usePersistedState('mapCluster', true);

  const onMarkerClick = useCallback(
    (_, deviceId) => {
      dispatch(devicesActions.selectId(deviceId));
      window.dispatchEvent(new CustomEvent('showStatusCard'));
    },
    [dispatch],
  );

  return (
    <>
      <MapView admin={admin}>
        <MapOverlay />
        <MapGeofence />
      <AnchorMapLayer />
        <MapAccuracy positions={filteredPositions} />
        <MapLiveRoutes deviceIds={filteredPositions.map((p) => p.deviceId)} />
        <MapPositions
          positions={filteredPositions}
          onMarkerClick={onMarkerClick}
          selectedPosition={selectedPosition}
          showStatus
          disabled={rulerActive}
        />
        <MapDefaultCamera filteredPositions={filteredPositions} />
        <MapSelectedDevice />
        <PoiMap />
        {admin && <MapRuler positions={filteredPositions} onActiveChange={setRulerActive} />}
        {admin && <MapNotification enabled onClick={onEventsClick} />}
        <MapTelegramButton />
        {admin && selectedPosition && <MapTrail selectedDeviceId={selectedPosition.deviceId} />}
        <MapClusterToggle enabled={mapCluster} onClick={() => setMapCluster(!mapCluster)} />
      </MapView>
      <MapScale />
      {admin && <MapCurrentLocation />}
      {admin && <MapGeocoder />}
      {desktop && (
        <MapPadding
          start={
            parseInt(theme.dimensions.drawerWidthDesktop, 10) + parseInt(theme.spacing(1.5), 10)
          }
        />
      )}
    </>
  );
};

export default MainMap;
