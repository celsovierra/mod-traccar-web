import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import ReportFilter from './components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import ResizeHandle from './components/ResizeHandle';
import { useCatchCallback } from '../reactHelper';
import MapView from '../map/core/MapView';
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import { formatTime } from '../common/util/formatter';
import { prefixString } from '../common/util/stringUtils';
import MapMarkers from '../map/MapMarkers';
import MapRouteCoordinates from '../map/MapRouteCoordinates';
import MapScale from '../map/MapScale';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { deviceEquality } from '../common/util/deviceEquality';

const CombinedReportPage = () => {
  const { classes } = useReportStyles();
  const t = useTranslation();

  const devices = useSelector((state) => state.devices.items, deviceEquality(['id', 'name']));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const customEventLabels = {
    anchorActivated: 'Ancora Ativada',
    anchorDeactivated: 'Ancora Desativada',
    anchorExited: 'Saiu da Ancora',
    deviceBlocked: 'Bloqueado',
    deviceUnblocked: 'Desbloqueado',
  };

  const itemsCoordinates = useMemo(() => items.flatMap((item) => item.route), [items]);

  const createMarkers = () =>
    items.flatMap((item) =>
      item.events
        .map((event) => item.positions.find((p) => event.positionId === p.id))
        .filter((position) => position != null)
        .map((position) => ({
          latitude: position.latitude,
          longitude: position.longitude,
        })),
    );

  const onShow = useCatchCallback(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    setLoading(true);
    try {
      const response = await fetchOrThrow(`/api/reports/combined?${query.toString()}`);
      const reportItems = await response.json();
      for (const it of reportItems) {
        try {
          const evRes = await fetch(`/api-device-event/${it.deviceId}?from=${from}&to=${to}`);
          if (evRes.ok) {
            const customEvents = await evRes.json();
            const mapped = customEvents.map((e) => ({
              id: e.id,
              type: e.type,
              eventTime: new Date(e.eventtime).getTime(),
              positionId: 0,
              user: (() => {
                try {
                  return JSON.parse(e.attributes || '{}').user || '';
                } catch {
                  return '';
                }
              })(),
            }));
            it.events = [...(it.events || []), ...mapped];
          }
        } catch (err) {}
      }
      setItems(reportItems);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportCombined']}>
      <div className={classes.container}>
        {false && Boolean(items.length) && (
          <>
            <div className={classes.containerMap}>
              <MapView>
                <MapGeofence />
                {items.map((item) => (
                  <MapRouteCoordinates
                    key={item.deviceId}
                    name={devices[item.deviceId].name}
                    coordinates={item.route}
                    deviceId={item.deviceId}
                  />
                ))}
                <MapMarkers markers={createMarkers()} />
              </MapView>
              <MapScale />
              <MapCamera coordinates={itemsCoordinates} />
            </div>
            <ResizeHandle />
          </>
        )}
        <div className={classes.containerMain}>
          <div className={classes.header}>
            <ReportFilter onShow={onShow} deviceType="multiple" loading={loading} hideGroups />
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('sharedDevice')}</TableCell>
                <TableCell>{t('positionFixTime')}</TableCell>
                <TableCell>{t('sharedType')}</TableCell>
                <TableCell>Usuario</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading ? (
                items.flatMap((item) =>
                  [...item.events].reverse().map((event, index) => (
                    <TableRow key={event.id}>
                      <TableCell>{index ? '' : devices[item.deviceId].name}</TableCell>
                      <TableCell>{formatTime(event.eventTime, 'seconds')}</TableCell>
                      <TableCell>
                        {customEventLabels[event.type] || t(prefixString('event', event.type))}
                      </TableCell>
                      <TableCell>{event.user || ''}</TableCell>
                    </TableRow>
                  )),
                )
              ) : (
                <TableShimmer columns={4} />
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageLayout>
  );
};

export default CombinedReportPage;
