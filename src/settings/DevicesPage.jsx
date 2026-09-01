import { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  Button,
  TableFooter,
  FormControlLabel,
  Switch,
  Box,
  Typography,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import CollectionFab from './components/CollectionFab';
import CollectionActions from './components/CollectionActions';
import TableShimmer from '../common/components/TableShimmer';
import SearchHeader from './components/SearchHeader';
import { formatStatus, formatTime } from '../common/util/formatter';
import { useDeviceReadonly, useManager } from '../common/util/permissions';
import useSettingsStyles from './common/useSettingsStyles';
import DeviceUsersValue from './components/DeviceUsersValue';
import usePersistedState from '../common/util/usePersistedState';
import fetchOrThrow from '../common/util/fetchOrThrow';
import exportExcel from '../common/util/exportExcel';

const DevicesPage = () => {
  const { classes } = useSettingsStyles();
  const navigate = useNavigate();
  const t = useTranslation();

  const manager = useManager();
  const deviceReadonly = useDeviceReadonly();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showAll, setShowAll] = usePersistedState('showAllDevices', false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await fetchOrThrow(`/api/devices?all=${showAll}`);
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [showAll]);

  const filteredItems = useMemo(() => {
    if (!searchKeyword.trim()) return items;
    const query = searchKeyword.toLowerCase().trim();

    return items.filter((item) => {
      const name = item.name ? String(item.name).toLowerCase() : '';
      const uniqueId = item.uniqueId ? String(item.uniqueId).toLowerCase() : '';
      const phone = item.phone ? String(item.phone).toLowerCase() : '';
      const model = item.model ? String(item.model).toLowerCase() : '';
      const contact = item.contact ? String(item.contact).toLowerCase() : '';
      const plate = item.attributes?.plate ? String(item.attributes.plate).toLowerCase() : '';

      return (
        name.includes(query) ||
        uniqueId.includes(query) ||
        phone.includes(query) ||
        model.includes(query) ||
        contact.includes(query) ||
        plate.includes(query)
      );
    });
  }, [items, searchKeyword]);

  const handleExport = async () => {
    const data = filteredItems.map((item) => ({
      [t('sharedName')]: item.name,
      [t('deviceIdentifier')]: item.uniqueId,
      [t('sharedPhone')]: item.phone,
      [t('deviceModel')]: item.model,
      [t('deviceContact')]: item.contact,
      [t('deviceStatus')]: formatStatus(item.status, t),
      [t('deviceLastUpdate')]: formatTime(item.lastUpdate, 'minutes'),
    }));
    const sheets = new Map();
    sheets.set(t('deviceTitle'), data);
    await exportExcel(t('deviceTitle'), 'devices.xlsx', sheets);
  };

  const actionConnections = {
    key: 'connections',
    title: t('sharedConnections'),
    icon: <LinkIcon fontSize="small" />,
    handler: (deviceId) => navigate(`/settings/device/${deviceId}/connections`),
  };

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'deviceTitle']}>
      {/* Barra de Pesquisa Fixa no topo */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          p: 1,
        }}
      >
        <SearchHeader keyword={searchKeyword} setKeyword={setSearchKeyword} />
      </Box>

      {/* Tabela de Linhas Padrão Traccar */}
      <Table className={classes.table}>
        <TableHead>
          <TableRow>
            <TableCell>{t('sharedName')}</TableCell>
            <TableCell>{t('deviceIdentifier')}</TableCell>
            <TableCell>{t('sharedPhone')}</TableCell>
            <TableCell>{t('deviceModel')}</TableCell>
            <TableCell>{t('deviceContact')}</TableCell>
            {manager && <TableCell>{t('settingsUsers')}</TableCell>}
            <TableCell className={classes.columnAction} />
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableShimmer columns={manager ? 6 : 5} endAction />
          ) : filteredItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={manager ? 7 : 6} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" sx={{ color: '#888' }}>
                  Nenhum dispositivo encontrado.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            filteredItems.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.uniqueId}</TableCell>
                <TableCell>{item.phone || '-'}</TableCell>
                <TableCell>{item.model || '-'}</TableCell>
                <TableCell>{item.contact || '-'}</TableCell>
                {manager && (
                  <TableCell>
                    <DeviceUsersValue deviceId={item.id} />
                  </TableCell>
                )}
                <TableCell className={classes.columnAction} padding="none">
                  <CollectionActions
                    itemId={item.id}
                    editPath="/settings/device"
                    endpoint="devices"
                    onReload={fetchDevices}
                    customActions={[actionConnections]}
                    readonly={deviceReadonly}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>
              <Button onClick={handleExport} variant="text" sx={{ textTransform: 'none', fontWeight: 600 }}>
                {t('reportExport')}
              </Button>
            </TableCell>
            <TableCell colSpan={manager ? 6 : 5} align="right">
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(showAll)}
                    onChange={(e) => setShowAll(e.target.checked)}
                    size="small"
                  />
                }
                label={t('notificationAlways')}
                labelPlacement="start"
                disabled={!manager}
              />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <CollectionFab editPath="/settings/device" />
    </PageLayout>
  );
};

export default DevicesPage;